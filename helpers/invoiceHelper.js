import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';


export const generateInvoice = (payment, user, courses) => {
  return new Promise((resolve, reject) => {
    try {

      const invoicesDir = path.join(process.cwd(), 'invoices');
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      const filename = `invoice-${payment.orderId}.pdf`;
      const filepath = path.join(invoicesDir, filename);

      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      doc.fontSize(24).font('Helvetica-Bold').text('INVOICE', 50, 50);
      doc.fontSize(10).font('Helvetica')
         .text('Learnify E-Learning Platform', 50, 80)
         .text('Email: support@learnify.com', 50, 95)
         .text('Phone: +91 1234567890', 50, 110);

      doc.fontSize(10)
         .text(`Invoice #: ${payment.orderId}`, 400, 50)
         .text(`Date: ${new Date(payment.createdAt).toLocaleDateString('en-IN')}`, 400, 65)
         .text(`Payment ID: ${payment.paymentId}`, 400, 80);

      doc.moveTo(50, 140).lineTo(550, 140).stroke();

      // Bill To section
      doc.fontSize(12).font('Helvetica-Bold').text('Bill To:', 50, 160);
      doc.fontSize(10).font('Helvetica')
         .text(user.fullName, 50, 180)
         .text(user.email, 50, 195);
      if (user.phone) doc.text(user.phone, 50, 210);

      doc.fontSize(10).font('Helvetica-Bold')
         .text('Course', 50, 250)
         .text('Tutor', 280, 250)
         .text('Price', 450, 250);

      doc.moveTo(50, 265).lineTo(550, 265).stroke();

      let yPosition = 280;
      let total = 0;
      doc.font('Helvetica');

      courses.forEach(course => {
        // Course title
        doc.text(course.title, 50, yPosition, { width: 210 });
        
        // Tutor name
        const tutorName = course.tutor?.fullName || 'N/A';
        doc.text(tutorName, 280, yPosition, { width: 150 });
        
        // Price
        doc.text(`₹${course.price.toLocaleString('en-IN')}`, 450, yPosition);
        
        total += course.price;
        yPosition += 25;
      });

      doc.moveTo(50, yPosition + 10).lineTo(550, yPosition + 10).stroke();

      // Total
      doc.fontSize(12).font('Helvetica-Bold')
         .text('Total Amount:', 350, yPosition + 30)
         .text(`₹${total.toLocaleString('en-IN')}`, 450, yPosition + 30);

      doc.fontSize(10).font('Helvetica')
         .fillColor('green').text('PAID', 450, yPosition + 50)
         .fillColor('black');

      doc.fontSize(8)
         .text('Thank you for your purchase!', 50, 700, { align: 'center', width: 500 })
         .text('This is a computer-generated invoice.', 50, 715, { align: 'center', width: 500 });

      doc.end();

      stream.on('finish', () => resolve(filepath));
      stream.on('error', (err) => reject(err));

    } catch (error) {
      reject(error);
    }
  });
};
