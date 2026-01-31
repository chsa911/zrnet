set -euxo pipefail

# clean mounts
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

UUID=$(blkid -s UUID -o value /dev/sda1)

KFILE=$(ls -1 /mnt/boot/vmlinuz-* 2>/dev/null | sort | tail -n 1)
KVER=$(basename "$KFILE" | sed 's/^vmlinuz-//')

# Create minimal initramfs-tools config if missing
mkdir -p /mnt/etc/initramfs-tools
if [ ! -f /mnt/etc/initramfs-tools/initramfs.conf ]; then
cat > /mnt/etc/initramfs-tools/initramfs.conf <<'EOC'
MODULES=most
BUSYBOX=auto
COMPRESS=zstd
EOC
fi
touch /mnt/etc/initramfs-tools/modules

# Generate initrd
chroot /mnt /usr/bin/bash -lc "
set -eux
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
update-initramfs -c -k '$KVER'
"

IFILE="/mnt/boot/initrd.img-$KVER"
test -e "$IFILE"

# Write a manual grub.cfg that boots this kernel+initrd
KPATH=${KFILE#/mnt}
IPATH=${IFILE#/mnt}

mkdir -p /mnt/boot/grub
cat > /mnt/boot/grub/grub.cfg <<EOF_GRUB
set default=0
set timeout=5

menuentry "Ubuntu (manual)" {
  insmod part_msdos
  insmod ext2
  search --no-floppy --fs-uuid --set=root $UUID
  linux $KPATH root=UUID=$UUID ro quiet
  initrd $IPATH
}
EOF_GRUB

sync
echo "OK: initrd created and /boot/grub/grub.cfg written"
echo "  UUID=$UUID"
echo "  KERNEL=$KPATH"
echo "  INITRD=$IPATH"
