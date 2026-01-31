set -euxo pipefail

# clean mounts
for m in /mnt/boot/efi /mnt/dev/pts /mnt/dev /mnt/proc /mnt/sys /mnt/run /mnt; do
  umount -lf "$m" 2>/dev/null || true
done

# mount root FS
mount /dev/sda1 /mnt

# chroot mounts
mount --bind /dev /mnt/dev
mkdir -p /mnt/dev/pts
mount -t devpts devpts /mnt/dev/pts
mount -t proc  proc  /mnt/proc
mount -t sysfs sysfs /mnt/sys
mount --bind /run /mnt/run

# EFI optional
mkdir -p /mnt/boot/efi
mount /dev/sda15 /mnt/boot/efi 2>/dev/null || true

# DNS for apt
cp -L /etc/resolv.conf /mnt/etc/resolv.conf || true

# IMPORTANT: copy your rescue SSH key into the disk OS root account
mkdir -p /mnt/root/.ssh
if [ -f /root/.ssh/authorized_keys ]; then
  cat /root/.ssh/authorized_keys >> /mnt/root/.ssh/authorized_keys || true
fi
chmod 700 /mnt/root/.ssh
chmod 600 /mnt/root/.ssh/authorized_keys || true

KVER=$(ls -1 /mnt/boot/vmlinuz-* 2>/dev/null | sed 's#.*/vmlinuz-##' | sort | tail -n 1)

chroot /mnt /usr/bin/bash -lc "
set -euxo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
export DEBIAN_FRONTEND=noninteractive
export TERM=dumb

# Ensure machine-id exists (helps dbus/others)
if [ ! -s /etc/machine-id ]; then
  dbus-uuidgen --ensure=/etc/machine-id || true
fi

# Fix dbus: ensure messagebus user/group exists
getent group messagebus >/dev/null 2>&1 || groupadd -r messagebus
id messagebus >/dev/null 2>&1 || useradd -r -g messagebus -d /nonexistent -s /usr/sbin/nologin messagebus || true

# Fix ssh: ensure sshd_config exists
mkdir -p /etc/ssh
if [ ! -s /etc/ssh/sshd_config ]; then
cat > /etc/ssh/sshd_config <<'SSHC'
Port 22
Protocol 2
PermitRootLogin prohibit-password
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
UsePAM yes
X11Forwarding no
PrintMotd no
Subsystem sftp /usr/lib/openssh/sftp-server
SSHC
fi

# Files you were missing earlier for initramfs hooks
mkdir -p /etc/initramfs-tools /etc/udev /etc/iscsi
cat > /etc/initramfs-tools/initramfs.conf <<'CONF'
MODULES=most
BUSYBOX=auto
COMPRESS=zstd
CONF
touch /etc/initramfs-tools/modules

cat > /etc/udev/udev.conf <<'UDEV'
udev_log=\"info\"
children_max=16
resolve_names=early
UDEV

echo \"InitiatorName=iqn.1993-08.org.debian:01:\$(cat /etc/machine-id 2>/dev/null || echo unknown)\" > /etc/iscsi/initiatorname.iscsi || true

# Keep grub from breaking dpkg: safe grub-mkconfig stub (don’t restore it yet)
if [ -x /usr/sbin/grub-mkconfig ] && [ ! -x /usr/sbin/grub-mkconfig.real ]; then
  mv /usr/sbin/grub-mkconfig /usr/sbin/grub-mkconfig.real
fi
UUID=\$(blkid -s UUID -o value /dev/sda1)
cat > /usr/sbin/grub-mkconfig <<MK
#!/bin/sh
OUT=/boot/grub/grub.cfg
if [ \"\${1:-}\" = \"-o\" ] && [ -n \"\${2:-}\" ]; then OUT=\"\$2\"; fi
cat > \"\$OUT\" <<CFG
set default=0
set timeout=5
menuentry \"Ubuntu\" {
  insmod part_msdos
  insmod ext2
  search --no-floppy --fs-uuid --set=root \$UUID
  linux /boot/vmlinuz-$KVER root=UUID=\$UUID ro quiet
  initrd /boot/initrd.img-$KVER
}
CFG
exit 0
MK
chmod +x /usr/sbin/grub-mkconfig

# Finish dpkg state and reinstall ONLY the services we need (skip udev!)
dpkg --configure -a || true
apt-get -f install -y || true
apt-get update
apt-get install -y --reinstall dbus openssh-server plymouth initramfs-tools || true

# SSH keys + enable ssh at boot
ssh-keygen -A || true
mkdir -p /etc/systemd/system/multi-user.target.wants
[ -f /lib/systemd/system/ssh.service ] && ln -sf /lib/systemd/system/ssh.service /etc/systemd/system/multi-user.target.wants/ssh.service || true
[ -f /usr/lib/systemd/system/ssh.service ] && ln -sf /usr/lib/systemd/system/ssh.service /etc/systemd/system/multi-user.target.wants/ssh.service || true

# rebuild initramfs
update-initramfs -u -k all || true

sync
echo OK_CHROOT_DONE
"

umount -R /mnt || true
echo OK_DONE
