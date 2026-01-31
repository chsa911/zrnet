set -euxo pipefail

# Clean up old mounts (this fixes the "No space left on device" mount error)
umount -R /mnt 2>/dev/null || true

# Mount installed system
mount /dev/sda1 /mnt

# Minimal mounts needed for dpkg/grub in chroot
mount --bind /dev /mnt/dev
mkdir -p /mnt/dev/pts
umount /mnt/dev/pts 2>/dev/null || true
mount -t devpts devpts /mnt/dev/pts

mount -t proc  proc  /mnt/proc 2>/dev/null || true
mount -t sysfs sysfs /mnt/sys  2>/dev/null || true
mount --bind /run /mnt/run 2>/dev/null || true

# Make sure awk exists BEFORE dpkg tries to configure grub-pc
# (ucf calls awk during grub-pc postinst)
cat > /mnt/usr/bin/awk <<'AWK'
#!/bin/sh
exec /usr/bin/mawk "$@"
AWK
chmod +x /mnt/usr/bin/awk

# Chroot and finish grub-pc configuration + write grub.cfg
chroot /mnt /usr/bin/bash -lc '
set -euxo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
export DEBIAN_FRONTEND=noninteractive
export TERM=dumb

apt-get update
apt-get install -y mawk debconf-utils

# Preseed install device so grub-pc doesn't ask questions
echo "grub-pc grub-pc/install_devices multiselect /dev/sda" | debconf-set-selections

# Finish any half-installed packages (grub-pc is currently half-configured)
dpkg --configure -a || true
apt-get -f install -y || true

# Install grub to disk and generate menu
grub-install /dev/sda
grub-mkconfig -o /boot/grub/grub.cfg

echo "===MENUENTRIES==="
grep -n menuentry /boot/grub/grub.cfg | head -n 20 || true
'

echo "DONE (now disable rescue in Hetzner UI and reboot from disk)"
