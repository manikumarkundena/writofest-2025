const nodemailer = require('nodemailer');
require('dotenv').config(); // Make sure it can read the .env variables

// 1. Create your email "transporter"
// This uses the secrets you added to Render
// 1. Create your email "transporter"
// This uses the secrets you added to Render
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT, // This will now be 465 from Render
  secure: true, // <-- THIS MUST BE TRUE FOR PORT 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 2. Define the email sending function
async function sendConfirmationEmail(name, email, event) {
  try {
    const mailOptions = {
      // This "from" address *MUST* be the email you verified in Brevo
      from: `"ScriptInk" <${process.env.EMAIL_USER}>`, 
      to: email, // The user's email from the form
      subject: 'Registration Confirmed! 🎉 WritoFest 2K25',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h1 style="color: #4A00E0; text-align: center;">Hi ${name}, you're in!</h1>
          <p style="font-size: 16px;">Thank you for registering for <strong>WritoFest 2K25</strong>. We're excited to see your creativity on stage!</p>
          
          <div style="background: #f4f4f4; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h3 style="border-bottom: 2px solid #ffd700; padding-bottom: 5px; margin-top: 0;">Your Registration Details:</h3>
            <ul style="list-style: none; padding-left: 0;">
              <li style="font-size: 16px; margin-bottom: 10px;"><b>Event:</b> ${event}</li>
              <li style="font-size: 16px; margin-bottom: 10px;"><b>Date:</b> November 15, 2025</li>
              <li style="font-size: 16px;"><b>Venue:</b> Media Centre, SIT</li>
            </ul>
          </div>
          
          <p style="font-size: 16px;">You can join our <a href="https://chat.whatsapp.com/LD8332WOEXaKxk1MJbSFh2" style="color: #007bff;">WhatsApp Group</a> for all the latest updates.</p>
          <p style="font-size: 16px;">See you there!<br><b>- The ScriptInk Team</b></p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Confirmation email sent to:', email);

  } catch (emailError) {
    // If the email fails, just log the error to the Render console
    // The user will still be registered
    console.error('Error sending confirmation email:', emailError);
  }
}

// 3. Export the function
module.exports = { sendConfirmationEmail };