const nodemailer  = require('nodemailer');

const transporter = nodemailer.createTransport({
    host : process.env.MAIL_HOST,
    port : Number(process.env.MAIL_PORT),
    secure: false,
    auth :{
        user : process.env.MAIL_USER,
        pass : process.env.MAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
}); 

const sendOTPEmail = async(to, otp, purpose ="signup") =>{
    const subject = purpose ==="reset"
     ? 'Reset Your Password - Organic Learn'
  : 'Verify Your Email - Organic Learn';

    


    const html =`
    <div style="font-family: sans-serif; max-width: 400px; margin: auto; padding: 20px;">
      <h2 style="color: #2beead;">Organic Learn</h2>
      <p>${purpose === 'reset' ? 'Your password reset code:' : 'Your email verification code:'}</p>
      <h1 style="letter-spacing: 10px; color: #0d1b17;">${otp}</h1>
      <p style="color: #999; font-size: 12px;">This code expires in 10 minutes. Do not share it.</p>
    </div>
  `;

await transporter.sendMail({
    from:process.env.MAIL_USER,
    to,
    subject,
    html
})

}
module.exports={sendOTPEmail};

