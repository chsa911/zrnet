set -euxo pipefail

# Clean mount mess first
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

# Ensure awk exists early (ucf needs it)
ln -sf /usr/bin/mawk /mnt/usr/bin/awk

chroot /mnt /usr/bin/bash -lc '
set -euxo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
export DEBIAN_FRONTEND=noninteractive
export TERM=dumb

# Ensure grub tooling + scripts exist
apt-get update
apt-get install -y mawk grub-common grub2-common

# Recreate /etc/default/grub if missing
mkdir -p /etc/default
if [ ! -s /etc/default/grub ]; then
cat > /etc/default/grub <<EOF_GRUB
GRUB_DEFAULT=0
GRUB_TIMEOUT_STYLE=menu
GRUB_TIMEOUT=5
GRUB_DISTRIBUTOR=`lsb_release -i -s 2>/dev/null || echo Ubuntu`
GRUB_CMDLINE_LINUX_DEFAULT="quiet"
GRUB_CMDLINE_LINUX=""
EOF_GRUB
fi

# Make sure grub.d scripts exist and are executable
ls -la /etc/grub.d
chmod +x /etc/grub.d/* || true

# Generate grub.cfg and ensure it has menu entries
grub-mkconfig -o /boot/grub/grub.cfg
grep -n menuentry /boot/grub/grub.cfg | head -n 20

# Now finish configuring grub-pc cleanly
dpkg --configure grub-pc || true
'
