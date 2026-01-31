set -euxo pipefail

mount /dev/sda1 /mnt || true
mount --bind /dev /mnt/dev
mkdir -p /mnt/dev/pts
umount /mnt/dev/pts 2>/dev/null || true
mount -t devpts devpts /mnt/dev/pts
mount -t proc  proc  /mnt/proc 2>/dev/null || true
mount -t sysfs sysfs /mnt/sys  2>/dev/null || true
mount --bind /run /mnt/run || true

# usr-merge + loader link
ln -sf /usr/bin  /mnt/bin
ln -sf /usr/sbin /mnt/sbin
ln -sf /usr/lib  /mnt/lib
mkdir -p /mnt/lib64
ln -sf /usr/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2 /mnt/lib64/ld-linux-x86-64.so.2

chroot /mnt /usr/bin/bash -lc '
set -euxo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
export DEBIAN_FRONTEND=noninteractive
export TERM=dumb

apt-get update
apt-get install -y mawk

# CRITICAL: provide awk BEFORE any dpkg configuration runs
cat > /usr/bin/awk <<EOF_AWK
#!/bin/sh
exec /usr/bin/mawk "$@"
EOF_AWK
chmod +x /usr/bin/awk

# now finish dpkg configuration (this should configure grub-pc successfully)
dpkg --configure -a || true
apt-get -f install -y || true

# if grub-pc still pending, try again explicitly
dpkg --configure grub-pc || true

# install grub to disk + create config
grub-install /dev/sda
grub-mkconfig -o /boot/grub/grub.cfg

echo "===MENUENTRIES==="
grep -n menuentry /boot/grub/grub.cfg | head -n 20 || true
'
