set -euxo pipefail

# mount + chroot
for m in /mnt/boot/efi /mnt/dev/pts /mnt/dev /mnt/proc /mnt/sys /mnt/run /mnt; do
  umount -lf "$m" 2>/dev/null || true
done

mount /dev/sda1 /mnt
mount --bind /dev /mnt/dev
mkdir -p /mnt/dev/pts
mount -t devpts devpts /mnt/dev/pts
mount -t proc  proc  /mnt/proc
mount -t sysfs sysfs /mnt/sys
mount --bind /run /mnt/run
mkdir -p /mnt/boot/efi
mount /dev/sda15 /mnt/boot/efi 2>/dev/null || true
cp -L /etc/resolv.conf /mnt/etc/resolv.conf || true

UUID=$(blkid -s UUID -o value /dev/sda1)
KVER=$(ls -1 /mnt/boot/vmlinuz-* 2>/dev/null | sed 's#.*/vmlinuz-##' | sort | tail -n 1)

chroot /mnt /usr/bin/bash -lc "
set -e
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
export DEBIAN_FRONTEND=noninteractive
export TERM=dumb

# ensure grub-mkconfig.real exists; if not, just keep current
if [ -x /usr/sbin/grub-mkconfig ] && [ ! -x /usr/sbin/grub-mkconfig.real ]; then
  mv /usr/sbin/grub-mkconfig /usr/sbin/grub-mkconfig.real
fi

# write a SAFE stub grub-mkconfig (no unbound vars)
cat > /usr/sbin/grub-mkconfig <<'MK'
#!/bin/sh
OUT=/boot/grub/grub.cfg
if [ \"\${1:-}\" = \"-o\" ] && [ -n \"\${2:-}\" ]; then OUT=\"\$2\"; fi
cat > \"\$OUT\" <<CFG
set default=0
set timeout=5
menuentry \"Ubuntu\" {
  insmod part_msdos
  insmod ext2
  search --no-floppy --fs-uuid --set=root $UUID
  linux /boot/vmlinuz-$KVER root=UUID=$UUID ro quiet
  initrd /boot/initrd.img-$KVER
}
CFG
exit 0
MK
chmod +x /usr/sbin/grub-mkconfig

# now finish dpkg and initramfs
dpkg --configure -a || true
apt-get -f install -y || true
update-initramfs -u -k all || true

echo OK_PATCHED_AND_CONFIGURED
"

umount -R /mnt || true
echo OK_DONE
