set -euxo pipefail

# clean old mounts
for m in /mnt/boot/efi /mnt/dev/pts /mnt/dev /mnt/proc /mnt/sys /mnt/run /mnt; do
  umount -lf "$m" 2>/dev/null || true
done

# mount root
mount /dev/sda1 /mnt

# essential mounts for chroot
mount --bind /dev /mnt/dev
mkdir -p /mnt/dev/pts
mount -t devpts devpts /mnt/dev/pts
mount -t proc  proc  /mnt/proc
mount -t sysfs sysfs /mnt/sys
mount --bind /run /mnt/run

# (optional) mount EFI partition if present
mkdir -p /mnt/boot/efi
mount /dev/sda15 /mnt/boot/efi 2>/dev/null || true

# DNS for apt in chroot
cp -L /etc/resolv.conf /mnt/etc/resolv.conf || true

chroot /mnt /usr/bin/bash -lc '
set -euxo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
export DEBIAN_FRONTEND=noninteractive
export TERM=dumb

# recreate minimal missing config files that broke initramfs earlier
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

# iscsi hook expects this file sometimes
echo "InitiatorName=iqn.1993-08.org.debian:01:$(cat /etc/machine-id 2>/dev/null || echo unknown)" > /etc/iscsi/initiatorname.iscsi || true

# dpkg/apt recovery
dpkg --configure -a || true
apt-get -f install -y || true

apt-get update

# reinstall the missing core bits that your boot errors mention
apt-get install -y --reinstall \
  dbus \
  openssh-server \
  udev \
  initramfs-tools \
  plymouth

# make sure ssh host keys exist
ssh-keygen -A || true

# ensure ssh is enabled at boot (systemctl often doesn’t work in chroot)
UNIT1=/lib/systemd/system/ssh.service
UNIT2=/usr/lib/systemd/system/ssh.service
mkdir -p /etc/systemd/system/multi-user.target.wants
if [ -f "$UNIT1" ]; then ln -sf "$UNIT1" /etc/systemd/system/multi-user.target.wants/ssh.service; fi
if [ -f "$UNIT2" ]; then ln -sf "$UNIT2" /etc/systemd/system/multi-user.target.wants/ssh.service; fi

# rebuild initramfs for all kernels (this is key)
update-initramfs -u -k all

sync
echo OK_REPAIRED
'

umount -R /mnt || true
echo DONE
