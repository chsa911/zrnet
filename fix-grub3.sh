set -euxo pipefail

# mount root
mount /dev/sda1 /mnt || true

# bind /dev
mount --bind /dev /mnt/dev

# make sure /mnt/dev/pts is a REAL devpts mount (not bind)
mkdir -p /mnt/dev/pts
umount /mnt/dev/pts 2>/dev/null || true
mount -t devpts devpts /mnt/dev/pts

# proc/sys/run
mount -t proc  proc  /mnt/proc 2>/dev/null || true
mount -t sysfs sysfs /mnt/sys  2>/dev/null || true
mount --bind /run /mnt/run

# usr-merge + loader link (keep)
ln -sf /usr/bin  /mnt/bin
ln -sf /usr/sbin /mnt/sbin
ln -sf /usr/lib  /mnt/lib
mkdir -p /mnt/lib64
ln -sf /usr/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2 /mnt/lib64/ld-linux-x86-64.so.2

# chroot: fix awk + configure grub-pc + install grub
chroot /mnt /usr/bin/bash -lc '
set -euxo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
export DEBIAN_FRONTEND=noninteractive
export DEBIAN_PRIORITY=critical
export TERM=dumb

# ensure mawk exists
apt-get update
apt-get install -y mawk debconf-utils

# IMPORTANT: create a real awk executable (ucf needs it)
cat > /usr/bin/awk <<EOF_AWK
#!/bin/sh
exec /usr/bin/mawk "$@"
EOF_AWK
chmod +x /usr/bin/awk

# finish half-installed packages
dpkg --configure -a || true
apt-get -f install -y || true

# preseed grub-pc to avoid interactive questions
echo "grub-pc grub-pc/install_devices multiselect /dev/sda" | debconf-set-selections

# configure grub-pc now
dpkg --configure grub-pc || true

# install grub to MBR + generate config
grub-install /dev/sda
grub-mkconfig -o /boot/grub/grub.cfg

echo "===MENUENTRIES==="
grep -n menuentry /boot/grub/grub.cfg | head -n 20 || true
'
