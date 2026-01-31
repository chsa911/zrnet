set -euxo pipefail

echo "== mounting disk =="
mount /dev/sda1 /mnt || true
mount --bind /dev  /mnt/dev
mount --bind /proc /mnt/proc
mount --bind /sys  /mnt/sys
mount --bind /run  /mnt/run

echo "== usr-merge symlinks + loader link =="
ln -sf /usr/bin  /mnt/bin
ln -sf /usr/sbin /mnt/sbin
ln -sf /usr/lib  /mnt/lib
mkdir -p /mnt/lib64
ln -sf /usr/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2 /mnt/lib64/ld-linux-x86-64.so.2

echo "== write noble apt sources + dns =="
cat > /mnt/etc/apt/sources.list <<'EOL'
deb http://archive.ubuntu.com/ubuntu noble main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu noble-updates main restricted universe multiverse
deb http://security.ubuntu.com/ubuntu noble-security main restricted universe multiverse
EOL
printf "nameserver 1.1.1.1\nnameserver 8.8.8.8\n" > /mnt/etc/resolv.conf

echo "== chroot: install kernel + grub, generate grub.cfg =="
chroot /mnt /usr/bin/bash -lc '
set -euxo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin

# disable deb822 sources if present (can conflict)
mv /etc/apt/sources.list.d/ubuntu.sources /etc/apt/sources.list.d/ubuntu.sources.bak 2>/dev/null || true

apt-get update
apt-get install -y linux-image-generic
apt-get install -y grub-pc

grub-install /dev/sda
grub-mkconfig -o /boot/grub/grub.cfg

echo "===KERNELS==="
ls -la /boot/vmlinuz* /boot/initrd.img* 2>/dev/null || true
echo "===MENUENTRIES==="
grep -n menuentry /boot/grub/grub.cfg | head -n 10 || true
'

echo "== unmount and reboot =="
umount -R /mnt
reboot
