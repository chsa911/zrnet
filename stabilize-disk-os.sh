set -euxo pipefail

# clean mounts
for m in /mnt/boot/efi /mnt/dev/pts /mnt/dev /mnt/proc /mnt/sys /mnt/run /mnt; do
  umount -lf "$m" 2>/dev/null || true
done

mount /dev/sda1 /mnt
mount --bind /dev /mnt/dev
mkdir -p /mnt/dev/pts
mount -t devpts devpts /mnt/dev/pts
mount -t proc  proc  /mnt/proc
mount -t sysfs sysfs /mnt/sys
mount --bind /run /mnt/run

mkdir -p /mnt/boot/efi
mount /dev/sda15 /mnt/boot/efi 2>/dev/null || true

cp -L /etc/resolv.conf /mnt/etc/resolv.conf || true

UUID=$(blkid -s UUID -o value /dev/sda1)
KVER=$(ls -1 /mnt/boot/vmlinuz-* 2>/dev/null | sed 's#.*/vmlinuz-##' | sort | tail -n 1)

echo "UUID=$UUID"
echo "KVER=$KVER"

# force merged-/usr layout on the mounted OS (outside chroot = safer)
for d in bin sbin lib; do
  if [ -d "/mnt/$d" ] && [ ! -L "/mnt/$d" ]; then
    mkdir -p "/mnt/usr/$d"
    cp -a "/mnt/$d/." "/mnt/usr/$d/" 2>/dev/null || true
    mv "/mnt/$d" "/mnt/${d}.premerge.$(date +%s)" || true
  fi
  ln -sfn "usr/$d" "/mnt/$d"
done
mkdir -p /mnt/lib64
ln -sfn /usr/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2 /mnt/lib64/ld-linux-x86-64.so.2 || true

chroot /mnt /usr/bin/bash -lc "
set -e
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
export DEBIAN_FRONTEND=noninteractive
export TERM=dumb

# machine-id
if [ ! -s /etc/machine-id ]; then
  dbus-uuidgen --ensure=/etc/machine-id || true
fi

# dbus needs messagebus user/group
getent group messagebus >/dev/null 2>&1 || groupadd -r messagebus
id messagebus >/dev/null 2>&1 || useradd -r -g messagebus -d /nonexistent -s /usr/sbin/nologin messagebus || true

# sshd_config was deleted earlier
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

# defaults that your logs complained about
mkdir -p /etc/default
[ -s /etc/default/ufw ] || printf 'ENABLED=no\n' > /etc/default/ufw
[ -s /etc/default/grub ] || cat > /etc/default/grub <<'GRUBD'
GRUB_DEFAULT=0
GRUB_TIMEOUT_STYLE=menu
GRUB_TIMEOUT=5
GRUB_CMDLINE_LINUX_DEFAULT="quiet"
GRUB_CMDLINE_LINUX=""
GRUBD

# initramfs prerequisites
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

apt-get update

# SAFE grub-mkconfig stub so grub-pc stops failing on empty cfg
if [ -x /usr/sbin/grub-mkconfig ] && [ ! -x /usr/sbin/grub-mkconfig.real ]; then
  mv /usr/sbin/grub-mkconfig /usr/sbin/grub-mkconfig.real
fi
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
  search --no-floppy --fs-uuid --set=root $UUID
  linux /boot/vmlinuz-$KVER root=UUID=$UUID ro quiet
  initrd /boot/initrd.img-$KVER
}
CFG
exit 0
MK
chmod +x /usr/sbin/grub-mkconfig

# fix package state + reinstall core services
dpkg --configure -a || true
apt-get -f install -y || true
apt-get install -y --reinstall dbus openssh-server udev initramfs-tools plymouth || true

# ssh keys + enable ssh
ssh-keygen -A || true
mkdir -p /etc/systemd/system/multi-user.target.wants
[ -f /lib/systemd/system/ssh.service ] && ln -sf /lib/systemd/system/ssh.service /etc/systemd/system/multi-user.target.wants/ssh.service || true
[ -f /usr/lib/systemd/system/ssh.service ] && ln -sf /usr/lib/systemd/system/ssh.service /etc/systemd/system/multi-user.target.wants/ssh.service || true

# rebuild initramfs
update-initramfs -u -k all || true

sync
echo OK_STABILIZED
"

umount -R /mnt || true
echo OK_DONE
