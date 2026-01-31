set -euxo pipefail

# clean old mounts
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
if [ -z "${KFILE:-}" ]; then
  echo "ERROR: no vmlinuz-* in /boot"
  ls -la /mnt/boot
  exit 1
fi
KVER=$(basename "$KFILE" | sed 's/^vmlinuz-//')

# generate initrd if missing
if ! ls /mnt/boot/initrd.img-"$KVER" >/dev/null 2>&1; then
  chroot /mnt /usr/bin/bash -lc "
set -eux
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
update-initramfs -c -k '$KVER' || update-initramfs -c -k all
"
fi

IFILE="/mnt/boot/initrd.img-$KVER"
if [ ! -e "$IFILE" ]; then
  echo "ERROR: initrd still missing after update-initramfs"
  ls -la /mnt/boot | sed -n '1,120p'
  exit 1
fi

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
echo "OK: wrote /boot/grub/grub.cfg"
echo "  UUID=$UUID"
echo "  KERNEL=$KPATH"
echo "  INITRD=$IPATH"
