import Payment from '../../models/Payment.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

const buildDateFilter = (filter, startDate, endDate) => {
    const now = new Date();
    let start, end;

    switch (filter) {
        case 'today':
            start = new Date(now.setHours(0, 0, 0, 0));
            end = new Date(now.setHours(23, 59, 59, 999));
            break;
        case 'week':
            start = new Date(now);
            start.setDate(now.getDate() - 7);
            end = new Date();
            break;
        case 'month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            break;
        case 'year':
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
            break;
        case 'custom':
            start = startDate ? new Date(startDate) : null;
            end = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : null;
            break;
        default:
            start = null;
            end = null;
    }

    if (start && end) return { createdAt: { $gte: start, $lte: end } };
    return {};
};

export const getSalesReport = async (req, res) => {
    try {
        const { filter = 'month', startDate, endDate } = req.query;
        const pendingCount = 0;

        const dateFilter = buildDateFilter(filter, startDate, endDate);
        const query = { status: 'completed', ...dateFilter };

        const orders = await Payment.find(query)
            .populate('user', 'fullName email')
            .populate('course', 'title price')
            .sort({ createdAt: -1 })
            .lean();

        // Latest 10 orders
        const latestOrders = await Payment.find({ status: 'completed' })
            .populate('user', 'fullName email')
            .populate('course', 'title price')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        // Stats
        const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
        const totalOrders = orders.length;
        const platformCommission = totalRevenue * 0.2;
        const tutorEarnings = totalRevenue * 0.8;

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyData = await Payment.aggregate([
            { $match: { status: 'completed', createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                    revenue: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.render('admin/sales-report', {
            orders,
            latestOrders,
            totalRevenue,
            totalOrders,
            platformCommission,
            tutorEarnings,
            monthlyData,
            filter,
            startDate: startDate || '',
            endDate: endDate || '',
            currentPage: 'sales-report',
            pendingCount
        });

    } catch (error) {
        console.error('Sales report error:', error);
        res.redirect('/admin/dashboard');
    }
};

export const downloadPDF = async (req, res) => {
    try {
        const { filter = 'month', startDate, endDate } = req.query;
        const dateFilter = buildDateFilter(filter, startDate, endDate);
        const query = { status: 'completed', ...dateFilter };

        const orders = await Payment.find(query)
            .populate('user', 'fullName email')
            .populate('course', 'title price')
            .sort({ createdAt: -1 })
            .lean();

        const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);

        const doc = new PDFDocument({ margin: 40, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=sales-report-${Date.now()}.pdf`);
        doc.pipe(res);

        // Header
        doc.rect(0, 0, 595, 80).fill('#00d9b1');
        doc.fillColor('white').fontSize(22).font('Helvetica-Bold').text('LEARNIFY', 40, 20);
        doc.fontSize(12).font('Helvetica').text('Sales Report', 40, 48);
        doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, 400, 48, { align: 'right' });

        doc.fillColor('#1a1a1a');
        doc.moveDown(3);

        // Stats
        doc.fontSize(14).font('Helvetica-Bold').text('Summary', 40, 100);
        doc.moveTo(40, 118).lineTo(555, 118).strokeColor('#e5e7eb').stroke();

        doc.fontSize(11).font('Helvetica');
        doc.text(`Total Orders: ${orders.length}`, 40, 125);
        doc.text(`Total Revenue: Rs. ${totalRevenue.toLocaleString()}`, 200, 125);
        doc.text(`Platform (20%): Rs. ${(totalRevenue * 0.2).toLocaleString()}`, 380, 125);

        const tableTop = 160;
        doc.rect(40, tableTop, 515, 24).fill('#f3f4f6');
        doc.fillColor('#374151').fontSize(9).font('Helvetica-Bold');
        doc.text('#', 48, tableTop + 8);
        doc.text('Order ID', 65, tableTop + 8);
        doc.text('Student', 175, tableTop + 8);
        doc.text('Course', 295, tableTop + 8);
        doc.text('Amount', 430, tableTop + 8);
        doc.text('Date', 485, tableTop + 8);

        let y = tableTop + 28;
        doc.font('Helvetica').fontSize(8);

        orders.forEach((order, i) => {
            if (y > 750) {
                doc.addPage();
                y = 40;
            }

            if (i % 2 === 0) {
                doc.rect(40, y - 4, 515, 20).fill('#f9fafb');
            }

            doc.fillColor('#374151');
            doc.text(String(i + 1), 48, y);
            doc.text((order.orderId || '').substring(0, 14), 65, y);
            doc.text((order.user?.fullName || 'N/A').substring(0, 16), 175, y);
            doc.text((order.course?.title || 'N/A').substring(0, 18), 295, y);
            doc.text(`Rs.${(order.amount || 0).toLocaleString()}`, 430, y);
            doc.text(new Date(order.createdAt).toLocaleDateString(), 485, y);

            y += 20;
        });

        doc.moveTo(40, y + 10).lineTo(555, y + 10).strokeColor('#e5e7eb').stroke();
        doc.fontSize(9).fillColor('#9ca3af').text(`Total: Rs. ${totalRevenue.toLocaleString()} from ${orders.length} orders`, 40, y + 18);

        doc.end();

    } catch (error) {
        console.error('PDF download error:', error);
        res.status(500).send('Failed to generate PDF');
    }
};

export const downloadExcel = async (req, res) => {
    try {
        const { filter = 'month', startDate, endDate } = req.query;
        const dateFilter = buildDateFilter(filter, startDate, endDate);
        const query = { status: 'completed', ...dateFilter };

        const orders = await Payment.find(query)
            .populate('user', 'fullName email')
            .populate('course', 'title price')
            .sort({ createdAt: -1 })
            .lean();

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Learnify';
        workbook.created = new Date();

        const sheet = workbook.addWorksheet('Sales Report');

        // Title row
        sheet.mergeCells('A1:G1');
        sheet.getCell('A1').value = 'LEARNIFY - Sales Report';
        sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF00D9B1' } };
        sheet.getCell('A1').alignment = { horizontal: 'center' };

        sheet.mergeCells('A2:G2');
        sheet.getCell('A2').value = `Generated: ${new Date().toLocaleDateString()} | Filter: ${filter}`;
        sheet.getCell('A2').alignment = { horizontal: 'center' };
        sheet.getCell('A2').font = { size: 10, color: { argb: 'FF6B7280' } };

        // Stats row
        const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
        sheet.getRow(3).values = ['', `Total Orders: ${orders.length}`, '', `Revenue: Rs.${totalRevenue}`, '', `Platform: Rs.${(totalRevenue * 0.2).toFixed(0)}`, ''];
        sheet.getRow(3).font = { bold: true };

        // Header row
        const headerRow = sheet.getRow(5);
        headerRow.values = ['#', 'Order ID', 'Student Name', 'Email', 'Course', 'Amount (Rs.)', 'Date'];
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00D9B1' } };
            cell.alignment = { horizontal: 'center' };
            cell.border = { bottom: { style: 'thin' } };
        });

        // Column widths
        sheet.columns = [
            { key: 'num', width: 5 },
            { key: 'orderId', width: 25 },
            { key: 'student', width: 20 },
            { key: 'email', width: 25 },
            { key: 'course', width: 30 },
            { key: 'amount', width: 15 },
            { key: 'date', width: 15 }
        ];

        // Data rows
        orders.forEach((order, i) => {
            const row = sheet.addRow([
                i + 1,
                order.orderId || 'N/A',
                order.user?.fullName || 'N/A',
                order.user?.email || 'N/A',
                order.course?.title || 'N/A',
                order.amount || 0,
                new Date(order.createdAt).toLocaleDateString()
            ]);

            if (i % 2 === 0) {
                row.eachCell(cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
                });
            }
        });

        // Summary sheet
        const summarySheet = workbook.addWorksheet('Summary');
        summarySheet.addRow(['Metric', 'Value']);
        summarySheet.addRow(['Total Orders', orders.length]);
        summarySheet.addRow(['Total Revenue', `Rs. ${totalRevenue}`]);
        summarySheet.addRow(['Platform Commission (20%)', `Rs. ${(totalRevenue * 0.2).toFixed(0)}`]);
        summarySheet.addRow(['Tutor Earnings (80%)', `Rs. ${(totalRevenue * 0.8).toFixed(0)}`]);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=sales-report-${Date.now()}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Excel download error:', error);
        res.status(500).send('Failed to generate Excel');
    }
};
