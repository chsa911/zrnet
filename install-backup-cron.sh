#!/usr/bin/env bash
# install-backup-cron.sh — add a daily cover backup cron job
# Run once: ./install-backup-cron.sh

SCRIPT="$HOME/zrnet-clean/backup-covers.sh"
CRON_LINE="0 3 * * * $SCRIPT >> $HOME/p_backup/backup.log 2>&1"

# Check if already installed
if crontab -l 2>/dev/null | grep -qF "$SCRIPT"; then
  echo "Cron job already installed."
  crontab -l | grep "$SCRIPT"
  exit 0
fi

# Add to crontab
(crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
echo "✅ Cron job installed — backup runs daily at 03:00."
echo "   Log: $HOME/p_backup/backup.log"
echo ""
echo "To remove: crontab -e (delete the backup-covers.sh line)"
echo "To run now: $SCRIPT"
