import { expect, test } from 'bun:test';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

// ユーザー情報とサーバー設定
const client = new ImapFlow({
  host: 'buntin.sakura.ne.jp', // IMAP サーバーのホスト名
  port: 993, // IMAP サーバーのポート（通常は 993）
  secure: true, // SSL/TLS を使用する場合は true
  auth: {
    user: 'mail@buntin.xyz', // ユーザー名
    pass: 'buntin0711', // パスワード
  },
});

const main = async () => {
  await client.connect();

  // メールボックスを選択（通常は 'INBOX'）
  let lock = await client.getMailboxLock('INBOX');
  const mailboxList = await client.list();
  for (let i = 0; i < mailboxList.length; i++) {
    console.log(i);
    console.log(mailboxList[i]);
  }
  try {
    // メールボックス内の全メールを検索
    const uids = await client.search({ seen: false }, { uid: true });
    console.log(uids);

    // for (let uid of uids) {
    //   let email = await client.fetchOne(uid, { source: true });

    //   // メールの解析
    //   let parsed = await simpleParser(email.source);

    //   // メールのタイトルを出力
    //   console.log(parsed.subject);
    // }
  } finally {
    // メールボックスのロックを解除
    lock.release();
  }

  // クライアントを切断
  await client.logout();
};
await main().catch((err) => console.error(err));


