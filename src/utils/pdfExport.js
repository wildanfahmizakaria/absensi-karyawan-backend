const PDFDocument = require('pdfkit');

/**
 * Generate Attendance Report PDF
 * @param {Array} rows - List of attendance session rows
 * @param {Object} options - Filter & metadata info
 * @returns {Promise<Buffer>}
 */
function generateAttendancePDF(rows, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 40
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // --- Header ---
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#0f4c81')
        .text('CV MANDALA MAHARDIKA', { align: 'center' });

      doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor('#333333')
        .text('LAPORAN REKAPITULASI KEHADIRAN KARYAWAN', { align: 'center' })
        .moveDown(0.5);

      const periodText = options.startDate && options.endDate
        ? `Periode: ${options.startDate} s/d ${options.endDate}`
        : 'Periode: Semua Riwayat';

      doc
        .fontSize(9)
        .font('Helvetica-Oblique')
        .fillColor('#666666')
        .text(`${periodText} | Dicetak pada: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`, { align: 'center' })
        .moveDown(1);

      // --- Summary Box ---
      const totalSessions = rows.length;
      const meetsCount = rows.filter(r => r.duration_status === 'MEETS_MINIMUM').length;
      const belowCount = rows.filter(r => r.duration_status === 'BELOW_MINIMUM').length;
      const inProgressCount = rows.filter(r => r.duration_status === 'IN_PROGRESS').length;

      doc
        .rect(40, doc.y, 762, 28)
        .fillAndStroke('#f0f4f8', '#cbd5e1');

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#1e293b')
        .text(
          `Total Sesi: ${totalSessions}   |   Memenuhi Durasi: ${meetsCount}   |   Kurang Durasi: ${belowCount}   |   Sedang Bertugas: ${inProgressCount}`,
          50,
          doc.y - 20,
          { align: 'left' }
        )
        .moveDown(1.5);

      // --- Table Headers ---
      const tableTop = doc.y + 5;
      const columns = [
        { label: 'No', x: 40, width: 30, align: 'center' },
        { label: 'Kode', x: 70, width: 65, align: 'left' },
        { label: 'Nama Karyawan', x: 135, width: 140, align: 'left' },
        { label: 'Waktu Masuk', x: 275, width: 110, align: 'center' },
        { label: 'Waktu Pulang', x: 385, width: 110, align: 'center' },
        { label: 'Durasi', x: 495, width: 85, align: 'center' },
        { label: 'Status Durasi', x: 580, width: 100, align: 'center' },
        { label: 'Catatan', x: 680, width: 122, align: 'left' }
      ];

      doc
        .rect(40, tableTop, 762, 22)
        .fill('#0f4c81');

      columns.forEach(col => {
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .text(col.label, col.x, tableTop + 6, { width: col.width, align: col.align });
      });

      let currentY = tableTop + 24;

      // --- Table Rows ---
      rows.forEach((row, index) => {
        // Page break if needed
        if (currentY > 520) {
          doc.addPage();
          currentY = 40;
        }

        const isEven = index % 2 === 0;
        if (isEven) {
          doc
            .rect(40, currentY, 762, 20)
            .fill('#f8fafc');
        }

        const durationText = row.elapsed_minutes !== null
          ? `${Math.floor(row.elapsed_minutes / 60)}j ${row.elapsed_minutes % 60}m`
          : '-';

        let statusLabel = 'Bertugas';
        let statusColor = '#0284c7';
        if (row.duration_status === 'MEETS_MINIMUM') {
          statusLabel = 'Memenuhi';
          statusColor = '#16a34a';
        } else if (row.duration_status === 'BELOW_MINIMUM') {
          statusLabel = 'Kurang';
          statusColor = '#dc2626';
        }

        doc.fillColor('#334155').fontSize(8).font('Helvetica');

        // Draw cells
        doc.text(String(index + 1), columns[0].x, currentY + 5, { width: columns[0].width, align: 'center' });
        doc.text(row.employee_code || '-', columns[1].x, currentY + 5, { width: columns[1].width, align: 'left' });
        doc.text(row.full_name || '-', columns[2].x, currentY + 5, { width: columns[2].width, align: 'left' });
        doc.text(row.check_in_at ? String(row.check_in_at).substring(0, 19) : '-', columns[3].x, currentY + 5, { width: columns[3].width, align: 'center' });
        doc.text(row.check_out_at ? String(row.check_out_at).substring(0, 19) : 'Aktif', columns[4].x, currentY + 5, { width: columns[4].width, align: 'center' });
        doc.text(durationText, columns[5].x, currentY + 5, { width: columns[5].width, align: 'center' });

        doc.fillColor(statusColor).font('Helvetica-Bold');
        doc.text(statusLabel, columns[6].x, currentY + 5, { width: columns[6].width, align: 'center' });

        doc.fillColor('#64748b').font('Helvetica');
        const notes = (row.notes || '-').substring(0, 25);
        doc.text(notes, columns[7].x, currentY + 5, { width: columns[7].width, align: 'left' });

        currentY += 20;
      });

      // Footer
      doc
        .fontSize(8)
        .fillColor('#94a3b8')
        .text('Sistem Absensi Karyawan CV Mandala Mahardika | Dokumen Resmi Rahasia', 40, 560, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateAttendancePDF
};

