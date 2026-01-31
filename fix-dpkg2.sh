set -euxo pipefail

mount /dev/sda1 /mnt || true

# bind mounts (more complete)
mount --bind /dev  /mnt/dev
mkdir -p /mnt/dev/pts
mount --bind /dev/pts /mnt/dev/pts
mount --bind /dev/ptmx /mnt/dev/ptmx || true
mount --bind /proc /mnt/proc
mount --bind /sys  /mnt/sys
mount --bind /run  /mnt/run

# make sure /dev/pts exists inside chroot
mkdir -p /mnt/dev/pts

# usr-merge + loader
ln -sf /usr/bin  /mnt/bin
ln -sf /usr/sbin /mnt/sbin
ln -sf /usr/lib  /mnt/lib
mkdir -p /mnt/lib64
ln -sf /usr/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2 /mnt/lib64/ld-linux-x86-64.so.2

# Ensure required users/groups exist (append if missing)
touch /mnt/etc/passwd /mnt/etc/group
grep -q '^root:'    /mnt/etc/passwd || echo 'root:x:0:0:root:/root:/usr/bin/bash' >> /mnt/etc/passwd
grep -q '^_apt:'    /mnt/etc/passwd || echo '_apt:x:42:65534::/nonexistent:/usr/sbin/nologin' >> /mnt/etc/passwd
grep -q '^nobody:'  /mnt/etc/passwd || echo 'nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin' >> /mnt/etc/passwd

grep -q '^root:'    /mnt/etc/group  || echo 'root:x:0:' >> /mnt/etc/group
grep -q '^nogroup:' /mnt/etc/group  || echo 'nogroup:x:65534:' >> /mnt/etc/group
grep -q '^_apt:'    /mnt/etc/group  || echo '_apt:x:42:' >> /mnt/etc/group

# add missing system groups commonly referenced by statoverride
grep -q '^crontab:' /mnt/etc/group  || echo 'crontab:x:105:' >> /mnt/etc/group

# noble sources + dns
cat > /mnt/etc/apt/sources.list <<'EOL'
deb http://archive.ubuntu.com/ubuntu noble main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu noble-updates main restricted universe multiverse
deb http://security.ubuntu.com/ubuntu noble-security main restricted universe multiverse
EOL
printf "nameserver 1.1.1.1\nnameserver 8.8.8.8\n" > /mnt/etc/resolv.conf

# Chroot: remove broken statoverrides, fix dpkg, install kernel+grub
chroot /mnt /usr/bin/bash -lc '
set -euxo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin

mv /etc/apt/sources.list.d/ubuntu.sources /etc/apt/sources.list.d/ubuntu.sources.bak 2>/dev/null || true

# If statoverride file references missing users/groups, clear it (safe; packages recreate overrides as needed)
if [ -f /var/lib/dpkg/statoverride ]; then
  cp -a /var/lib/dpkg/statoverride /var/lib/dpkg/statoverride.bak.$(date +%s) || true
  : > /var/lib/dpkg/statoverride
fi

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
