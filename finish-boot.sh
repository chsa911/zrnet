set -euxo pipefail

# mount + bind (INCLUDING pts + ptmx)
mount /dev/sda1 /mnt || true
mount --bind /dev  /mnt/dev
mkdir -p /mnt/dev/pts
mount --bind /dev/pts /mnt/dev/pts
mount --bind /dev/ptmx /mnt/dev/ptmx || true
mount --bind /proc /mnt/proc
mount --bind /sys  /mnt/sys
mount --bind /run  /mnt/run

# usr-merge + loader link
ln -sf /usr/bin  /mnt/bin
ln -sf /usr/sbin /mnt/sbin
ln -sf /usr/lib  /mnt/lib
mkdir -p /mnt/lib64
ln -sf /usr/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2 /mnt/lib64/ld-linux-x86-64.so.2

# make sure groups referenced by dpkg exist
touch /mnt/etc/group
grep -q '^crontab:' /mnt/etc/group || echo 'crontab:x:105:' >> /mnt/etc/group
grep -q '^plugdev:' /mnt/etc/group || echo 'plugdev:x:46:' >> /mnt/etc/group

# chroot: patch chfn temporarily, finish dpkg, install kernel + grub, generate grub.cfg
chroot /mnt /usr/bin/bash -lc '
set -euxo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin

# ensure pts exists
mkdir -p /dev/pts

# disable deb822 sources if present
mv /etc/apt/sources.list.d/ubuntu.sources /etc/apt/sources.list.d/ubuntu.sources.bak 2>/dev/null || true

# TEMPORARILY disable chfn (PAM often fails in chroot during package installs)
if [ -x /usr/bin/chfn ] && [ ! -x /usr/bin/chfn.real ]; then
  mv /usr/bin/chfn /usr/bin/chfn.real
  printf "#!/bin/sh\nexit 0\n" > /usr/bin/chfn
  chmod +x /usr/bin/chfn
fi

# clear statoverride (we already backed it earlier; this avoids missing user/group refs)
if [ -f /var/lib/dpkg/statoverride ]; then
  : > /var/lib/dpkg/statoverride
fi

# finish any half-installed packages
dpkg --configure -a || true
apt-get -f install -y || true

apt-get update
apt-get install -y linux-image-generic grub-pc

grub-install /dev/sda
grub-mkconfig -o /boot/grub/grub.cfg

echo "===KERNELS==="
ls -la /boot/vmlinuz* /boot/initrd.img* 2>/dev/null || true
echo "===MENUENTRIES==="
grep -n menuentry /boot/grub/grub.cfg | head -n 10 || true

# restore chfn
if [ -x /usr/bin/chfn.real ]; then
  rm -f /usr/bin/chfn
  mv /usr/bin/chfn.real /usr/bin/chfn
fi
'

umount -R /mnt
reboot
