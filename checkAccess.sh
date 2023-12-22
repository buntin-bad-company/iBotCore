#!/bin/bash

# Nginxユーザーを指定します（nginxまたはwww-data）
NGINX_USER="nginx"

# コマンドライン引数からファイルパスを取得
if [ "$#" -ne 1 ]; then
  echo "使用法: $0 [ファイルパス]"
  exit 1
fi

CHECK_PATH="$1"

# Nginxユーザーとしてファイルへのアクセス権限をテスト
if sudo -u $NGINX_USER test -r "$CHECK_PATH"; then
  echo "Nginxユーザー($NGINX_USER)は$CHECK_PATHにアクセス可能です。"
else
  echo "Nginxユーザー($NGINX_USER)は$CHECK_PATHにアクセス不可能です。"
fi
