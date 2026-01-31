set -euxo pipefail

# Mount disk OS + bind mounts (INCLUDING /dev/pts)
mount /dev/sda1 /mnt || true
mount --bind /dev /mnt/dev
mkdir -p /mnt/dev/pts
mount --bind /dev/pts /mnt/dev/pts
mount --bind /proc /mnt/proc
mount --bind /sys  /mnt/sys
mount --bind /run  /mnt/run

# usr-merge symlinks + loader link (needed for chroot execution)
ln -sf /usr/bin  /mnt/bin
ln -sf /usr/sbin /mnt/sbin
ln -sf /usr/lib  /mnt/lib
mkdir -p /mnt/lib64
ln -sf /usr/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2 /mnt/lib64/ld-linux-x86-64.so.2

# Ensure required users exist (append if missing; keep existing file)
touch /mnt/etc/passwd /mnt/etc/group

grep -q '^root:' /mnt/etc/passwd || echo 'root:x:0:0:root:/root:/usr/bin/bash' >> /mnt/etc/passwd
grep -q '^_apt:' /mnt/etc/passwd || echo '_apt:x:42:65534::/nonexistent:/usr/sbin/nologin' >> /mnt/etc/passwd
grep -q '^nobody:' /mnt/etc/passwd || echo 'nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin' >> /mnt/etc/passwd

grep -q '^root:' /mnt/etc/group || echo 'root:x:0:' >> /mnt/etc/group
grep -q '^_apt:' /mnt/etc/group || echo '_apt:x:42:' >> /mnt/etc/group
grep -q '^nogroup:' /mnt/etc/group || echo 'nogroup:x:65534:' >> /mnt/etc/group

# Ubuntu 24.04 (noble) apt sources + DNS in installed OS
cat > /mnt/etc/apt/sources.list <<'EOL'
deb http://archive.ubuntu.com/ubuntu noble main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu noble-updates main restricted universe multiverse
deb http://security.ubuntu.com/ubuntu noble-security main restricted universe multiverse
EOL
printf "nameserver 1.1.1.1\nnameserver 8.8.8.8\n" > /mnt/etc/resolv.conf

# Chroot: repair dpkg, install kernel + grub, generate grub.cfg
chroot /mnt /usr/bin/bash -lc '
set -euxo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin

# disable deb822 sources if present
mv /etc/apt/sources.list.d/ubuntu.sources /etc/apt/sources.list.d/ubuntu.sources.bak 2>/dev/null || true

# dpkg recovery
dpkg --configure -a || true
apt-get -f install -y || true

apt-get update
apt-get install -y linux-image-generic
apt-get install -y grub-pc

grub-install /dev/sda
grub-mkconfig -o /boot/grub/grub.cfg

echo "===KERNELS==="
ls -la /boot/vmlinuz* /boot/initrd.img* 2>/dev/null
echo "===MENUENTRIES==="
grep -n menuentry /boot/grub/grub.cfg | head -n 10
'

umount -R /mnt
reboot
