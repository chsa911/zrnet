set -euxo pipefail

# clean mounts
for m in /mnt/boot/efi /mnt/dev/pts /mnt/dev /mnt/proc /mnt/sys /mnt/run /mnt; do
  umount -lf "$m" 2>/dev/null || true
done

mount /dev/sda1 /mnt

# mounts for chroot
mount --bind /dev /mnt/dev
mkdir -p /mnt/dev/pts
mount -t devpts devpts /mnt/dev/pts
mount -t proc  proc  /mnt/proc
mount -t sysfs sysfs /mnt/sys
mount --bind /run /mnt/run

# EFI (optional)
mkdir -p /mnt/boot/efi
mount /dev/sda15 /mnt/boot/efi 2>/dev/null || true

# DNS for apt in chroot
cp -L /etc/resolv.conf /mnt/etc/resolv.conf || true

chroot /mnt /usr/bin/bash -lc '
set -euxo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
export DEBIAN_FRONTEND=noninteractive
export TERM=dumb

# --- Fix "merged /usr" layout so udev can install ---
# If /bin,/sbin,/lib exist as real dirs, move them aside and create symlinks.
# If they are missing, create the symlinks.
for d in bin sbin lib; do
  if [ -e "/$d" ] && [ ! -L "/$d" ]; then
    mv "/$d" "/${d}.preusrmerge.$(date +%s)" || true
  fi
done

[ -L /bin ]  || ln -sf usr/bin  /bin
[ -L /sbin ] || ln -sf usr/sbin /sbin
[ -L /lib ]  || ln -sf usr/lib  /lib

# loader link (helps with chroot exec on some setups)
mkdir -p /lib64
ln -sf /usr/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2 /lib64/ld-linux-x86-64.so.2 || true

# Make sure required config files exist (you already discovered these missing)
mkdir -p /etc/initramfs-tools /etc/udev /etc/iscsi
cat > /etc/initramfs-tools/initramfs.conf <<EOF_CONF
MODULES=most
BUSYBOX=auto
COMPRESS=zstd
EOF_CONF
touch /etc/initramfs-tools/modules

cat > /etc/udev/udev.conf <<EOF_UDEV
udev_log="info"
children_max=16
resolve_names=early
EOF_UDEV

echo "InitiatorName=iqn.1993-08.org.debian:01:$(cat /etc/machine-id 2>/dev/null || echo unknown)" > /etc/iscsi/initiatorname.iscsi || true

# dpkg recovery (don’t fail the whole script if grub-pc still complains)
dpkg --configure -a || true
apt-get -f install -y || true

apt-get update

# Install usrmerge (ok if it’s already installed)
apt-get install -y usrmerge || true

# Now udev should install (this was failing before)
apt-get install -y --reinstall udev || true

# Reinstall the services that failed at boot + plymouth
apt-get install -y --reinstall dbus openssh-server initramfs-tools plymouth || true

# Ensure ssh enabled at boot
mkdir -p /etc/systemd/system/multi-user.target.wants
[ -f /lib/systemd/system/ssh.service ] && ln -sf /lib/systemd/system/ssh.service /etc/systemd/system/multi-user.target.wants/ssh.service || true
[ -f /usr/lib/systemd/system/ssh.service ] && ln -sf /usr/lib/systemd/system/ssh.service /etc/systemd/system/multi-user.target.wants/ssh.service || true
ssh-keygen -A || true

# Rebuild initramfs now that udev/plymouth configs exist
update-initramfs -u -k all || true

sync
echo OK_DONE_IN_CHROOT
'

umount -R /mnt || true
echo OK_DONE_OUTSIDE
