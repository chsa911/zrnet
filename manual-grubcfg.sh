set -euxo pipefail

# Clean stale mounts (prevents devpts/mount-table issues)
for m in /mnt/dev/pts /mnt/dev /mnt/proc /mnt/sys /mnt/run /mnt; do
  umount -lf "$m" 2>/dev/null || true
done

mount /dev/sda1 /mnt

UUID=$(blkid -s UUID -o value /dev/sda1)

K=$(ls -1 /mnt/boot/vmlinuz-* 2>/dev/null | sort | tail -n 1)
I=$(ls -1 /mnt/boot/initrd.img-* 2>/dev/null | sort | tail -n 1)

if [ -z "$K" ] || [ -z "$I" ]; then
  echo "ERROR: kernel/initrd not found in /boot"
  ls -la /mnt/boot
  exit 1
fi

KPATH=${K#/mnt}
IPATH=${I#/mnt}

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
echo "WROTE /boot/grub/grub.cfg"
echo "  UUID=$UUID"
echo "  KERNEL=$KPATH"
echo "  INITRD=$IPATH"
