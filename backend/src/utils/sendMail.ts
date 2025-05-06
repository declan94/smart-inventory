import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({ region: process.env.AWS_REGION || "ap-southeast-1" });

interface SendMailParams {
  to: string[]; // 收件人列表
  subject: string;
  html: string;
  from?: string; // 可选，默认用 SES 验证过的邮箱
}

/**
 * 通过 AWS SES 发送邮件
 */
export async function sendMail(params: SendMailParams): Promise<void> {
  const { to, subject, html, from } = params;
  const fromAddress = from || process.env.SES_FROM_ADDRESS;
  if (!fromAddress) {
    throw new Error("未配置 SES 发件人邮箱（SES_FROM_ADDRESS）");
  }
  if (!to || to.length === 0) {
    throw new Error("收件人不能为空");
  }

  const command = new SendEmailCommand({
    Source: fromAddress,
    Destination: {
      ToAddresses: to,
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Data: html,
          Charset: "UTF-8",
        },
      },
    },
  });

  await ses.send(command);
}