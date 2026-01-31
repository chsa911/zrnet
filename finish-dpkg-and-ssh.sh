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

chroot /mnt /usr/bin/bash -lc "
set -euxo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
export DEBIAN_FRONTEND=noninteractive
export TERM=dumb

# --- required identities (fixes dbus failure) ---
getent group messagebus >/dev/null 2>&1 || groupadd -r messagebus
id messagebus >/dev/null 2>&1 || useradd -r -g messagebus -d /nonexistent -s /usr/sbin/nologin messagebus || true

# machine-id helps a lot of services
if [ ! -s /etc/machine-id ]; then
  dbus-uuidgen --ensure=/etc/machine-id || true
fi

# --- sshd_config was deleted; recreate minimal config (fixes openssh-server postinst) ---
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

# --- /etc/default/grub was deleted; recreate minimal (prevents some grub scripts from choking) ---
mkdir -p /etc/default
if [ ! -s /etc/default/grub ]; then
cat > /etc/default/grub <<'GRUBD'
GRUB_DEFAULT=0
GRUB_TIMEOUT_STYLE=menu
GRUB_TIMEOUT=5
GRUB_CMDLINE_LINUX_DEFAULT=\"quiet\"
GRUB_CMDLINE_LINUX=\"\"
GRUBD
fi

# --- TEMP: stub grub-mkconfig so grub-pc postinst stops failing ---
# (we restore it after dpkg finishes)
if [ -x /usr/sbin/grub-mkconfig ] && [ ! -x /usr/sbin/grub-mkconfig.real ]; then
  mv /usr/sbin/grub-mkconfig /usr/sbin/grub-mkconfig.real
  cat > /usr/sbin/grub-mkconfig <<EOF_MK
#!/bin/sh
OUT=/boot/grub/grub.cfg
if [ \"\$1\" = \"-o\" ] && [ -n \"\$2\" ]; then OUT=\"\$2\"; fi
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
EOF_MK
  chmod +x /usr/sbin/grub-mkconfig
fi

# --- finish dpkg safely now ---
dpkg --configure -a || true
apt-get -f install -y || true

# ensure ssh keys exist
ssh-keygen -A || true

# enable ssh at boot
mkdir -p /etc/systemd/system/multi-user.target.wants
[ -f /lib/systemd/system/ssh.service ] && ln -sf /lib/systemd/system/ssh.service /etc/systemd/system/multi-user.target.wants/ssh.service || true
[ -f /usr/lib/systemd/system/ssh.service ] && ln -sf /usr/lib/systemd/system/ssh.service /etc/systemd/system/multi-user.target.wants/ssh.service || true

# rebuild initramfs (so plymouth/dbus/udev pieces are consistent)
update-initramfs -u -k all || true

# restore real grub-mkconfig if we replaced it
if [ -x /usr/sbin/grub-mkconfig.real ]; then
  mv -f /usr/sbin/grub-mkconfig.real /usr/sbin/grub-mkconfig
fi

sync
echo OK_FIXED
"

umount -R /mnt || true
echo OK_DONE
