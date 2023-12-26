#!/bin/bash

# .chatGPT ディレクトリが存在しない場合は作成
mkdir -p "$HOME/.chatGPT"

# 現在の最大番号を見つける
last_num=$(ls "$HOME/.chatGPT/conversation"*.md 2> /dev/null | sed 's/[^0-9]*//g' | sort -n | tail -n 1)

# 番号が見つからなければ、1から始める
if [ -z "$last_num" ]; then
  next_num=1
else
  next_num=$((last_num + 1))
fi

# 新しいファイル名を生成
new_file="$HOME/.chatGPT/conversation${next_num}.md"

# ペーストボードの内容を新しいファイルに保存
pbpaste > "$new_file"

# ファイル作成の成功をチェック
if [ -f "$new_file" ]; then
  echo "ファイルが保存されました: $new_file"
else
  echo "エラー: ファイルを保存できませんでした: $new_file"
fi
