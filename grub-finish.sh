set -euxo pipefail

# Clean old mounts to avoid mount-table/full issues
for m in /mnt/dev/pts /mnt/dev /mnt/proc /mnt/sys /mnt/run /mnt; do
  umount -lf "$m" 2>/dev/null || true
done

mount /dev/sda1 /mnt
mount --bind /dev /mnt/dev
mkdir -p /mnt/dev/pts
mount -t devpts devpts /mnt/dev/pts
mount -t proc  proc  /mnt/proc
mount -t sysfs sysfs /mnt/sys
mount --bind /run /mnt/run

# Make sure /dev/ptmx exists inside the chroot
[ -e /mnt/dev/ptmx ] || ln -sf pts/ptmx /mnt/dev/ptmx

# CRITICAL: provide awk as a real executable BEFORE dpkg config runs
# Use a symlink to mawk (binary), so it doesn't depend on /bin/sh
ln -sf /usr/bin/mawk /mnt/usr/bin/awk

chroot /mnt /usr/bin/bash -lc '
set -euxo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
export DEBIAN_FRONTEND=noninteractive
export TERM=dumb

apt-get update
apt-get install -y mawk debconf-utils

# sanity: awk must exist now
command -v awk
awk "BEGIN{print 1}"

# Preseed grub-pc install device to avoid prompts
echo "grub-pc grub-pc/install_devices multiselect /dev/sda" | debconf-set-selections

# Finish configuring any half-installed packages (grub-pc is currently stuck)
dpkg --configure -a || true
apt-get -f install -y || true

# Write grub to disk and generate menu
grub-install /dev/sda
grub-mkconfig -o /boot/grub/grub.cfg

echo "===MENUENTRIES==="
grep -n menuentry /boot/grub/grub.cfg | head -n 20 || true
'

umount -R /mnt || true
reboot
