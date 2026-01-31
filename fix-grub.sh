set -euxo pipefail

# mount + bind (include pts)
mount /dev/sda1 /mnt || true
mount --bind /dev  /mnt/dev
mkdir -p /mnt/dev/pts
mount --bind /dev/pts /mnt/dev/pts || true
mount --bind /proc /mnt/proc || true
mount --bind /sys  /mnt/sys || true
mount --bind /run  /mnt/run || true

# usr-merge + loader
ln -sf /usr/bin  /mnt/bin
ln -sf /usr/sbin /mnt/sbin
ln -sf /usr/lib  /mnt/lib
mkdir -p /mnt/lib64
ln -sf /usr/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2 /mnt/lib64/ld-linux-x86-64.so.2

# chroot and fix grub-pc
chroot /mnt /usr/bin/bash -lc '
set -euxo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
export DEBIAN_FRONTEND=noninteractive
export TERM=dumb

apt-get update

# Ensure awk exists as /usr/bin/awk
apt-get install -y mawk
ln -sf /usr/bin/mawk /usr/bin/awk

# Fix any half-installed packages
dpkg --configure -a || true
apt-get -f install -y || true

# Configure grub-pc now that awk exists
dpkg --configure grub-pc || true

# Install grub to disk and generate config
grub-install /dev/sda
grub-mkconfig -o /boot/grub/grub.cfg

echo "===KERNELS==="
ls -la /boot/vmlinuz* /boot/initrd.img* 2>/dev/null || true
echo "===MENUENTRIES==="
grep -n menuentry /boot/grub/grub.cfg | head -n 20 || true
'
