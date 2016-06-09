#!/bin/bash
# Note: if you update this file and deploy, this script will be invoke on the server.

D=$(date +"__%Y_%m_%d___%H_%M_%S")
LOG=$(pwd)/logs/restart_$D.log
echo === $D === &> $LOG
pm2 delete all >> $LOG 2>&1
echo === Bower install === >> $LOG 2>&1
cd ./Client >> $LOG 2>&1
bower install --no-interactive --config.interactive=false >> $LOG 2>&1
cd ../ >> $LOG 2>&1
echo === NPM install === >> $LOG 2>&1
sudo npm install -y --no-bin-links >> $LOG 2>&1
echo === Starting server === >> $LOG 2>&1
pm2 start ./src/server.js -- --dbhost=<db-host> --logsvr=<log-server> --production >> $LOG 2>&1
pm2 save >> $LOG 2>&1
echo === Restart after commit $HG_NODE === >> $LOG 2>&1
