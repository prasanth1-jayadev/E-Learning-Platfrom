import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';


export const generateInvoice = (payments, user, courses) => {
  return new Promise((resolve, reject) => {
    try {
      const payment = Array.isArray(payments) ? payments[0] : payments;
      const paymentList = Array.isArray(payments) ? payments : [payments];

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

      doc.fontSize(12).font('Helvetica-Bold').text('Bill To:', 50, 160);
      doc.fontSize(10).font('Helvetica')
         .text(user.fullName, 50, 180)
         .text(user.email, 50, 195);
      if (user.phone) doc.text(user.phone, 50, 210);

      doc.fontSize(10).font('Helvetica-Bold')
         .text('Course', 50, 250)
         .text('Tutor', 280, 250)
         .text('Price (Excl. Tax)', 450, 250);

      doc.moveTo(50, 265).lineTo(550, 265).stroke();

      let yPosition = 280;
      let subtotal = 0;
      let taxTotal = 0;
      let grandTotal = 0;
      doc.font('Helvetica');

      paymentList.forEach(pay => {
        const course = pay.course;
        if (!course) return;

        const totalPaid = pay.amount;
        const basePrice = totalPaid / 1.18; // 18% inclusive tax base price
        const taxAmount = totalPaid - basePrice; 

        // Course title
        doc.text(course.title, 50, yPosition, { width: 210 });
        
        const tutorName = course.tutor?.fullName || 'N/A';
        doc.text(tutorName, 280, yPosition, { width: 150 });
        
        doc.text(`₹${basePrice.toFixed(2)}`, 450, yPosition);
        
        subtotal += basePrice;
        taxTotal += taxAmount;
        grandTotal += totalPaid;
        yPosition += 25;
      });

      doc.moveTo(50, yPosition + 10).lineTo(550, yPosition + 10).stroke();

      doc.fontSize(10).font('Helvetica-Bold')
         .text('Subtotal:', 350, yPosition + 25)
         .text(`₹${subtotal.toFixed(2)}`, 450, yPosition + 25);

      doc.fontSize(10).font('Helvetica-Bold')
         .text('GST (18%):', 350, yPosition + 40)
         .text(`₹${taxTotal.toFixed(2)}`, 450, yPosition + 40);

      doc.fontSize(12).font('Helvetica-Bold')
         .text('Total Amount:', 350, yPosition + 60)
         .text(`₹${grandTotal.toFixed(2)}`, 450, yPosition + 60);

       doc.fontSize(10).font('Helvetica')
         .fillColor('green').text('PAID', 450, yPosition + 80)
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
