import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiPrinter, FiArrowLeft } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { getCustomerPrintData } from '../services/api';

const toDate = (d) => d ? (typeof d === 'string' ? d.split('T')[0] : new Date(d).toISOString().split('T')[0]) : '';
const COMPANY = 'บริษัท อี.เค.ไทยปลา ฟิช แอนด์ ซูชิ จำกัด สาขาวงเวียน์อักษา';
const DOC_FOOTER = 'FM-CS-001 Rev.01';
const BLANK_ROWS = 10;

function CustomerPrint() {
  const { depositId, withdrawalId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getCustomerPrintData(depositId || 0, withdrawalId || 0);
        setData(res.data);
      } catch { toast.error('โหลดข้อมูลไม่สำเร็จ'); }
      finally { setLoading(false); }
    })();
  }, [depositId, withdrawalId]);

  const handlePrint = () => window.print();

  if (loading) return <div className="loading"><div className="spinner"></div>Loading...</div>;
  if (!data) return <div style={{ padding: 40, textAlign: 'center' }}>ไม่พบข้อมูล</div>;

  const { deposit, withdrawal } = data;
  const customer = deposit || withdrawal;
  if (!customer) return <div style={{ padding: 40, textAlign: 'center' }}>ไม่พบข้อมูล</div>;

  const depItems = deposit?.items || [];
  const wdItems = withdrawal?.items || [];
  const depTotalBoxes = depItems.reduce((s, it) => s + (it.boxes || 0), 0);
  const depTotalKg = depItems.reduce((s, it) => s + Number(it.weight_kg || 0), 0);
  const wdTotalBoxes = wdItems.reduce((s, it) => s + (it.boxes_out || 0), 0);
  const wdTotalKg = wdItems.reduce((s, it) => s + Number(it.weight_kg_out || 0), 0);

  const fillBlanks = (items, count) => {
    const blanks = [];
    for (let i = items.length; i < count; i++) blanks.push(i);
    return blanks;
  };

  return (
    <>
      <div className="cp-toolbar no-print">
        <button className="btn btn-outline" onClick={() => navigate(-1)}><FiArrowLeft /> กลับ</button>
        <button className="btn btn-primary" onClick={handlePrint}><FiPrinter /> พิมพ์</button>
      </div>

      <div className="cp-print-area" ref={printRef}>
        {/* ═══════ รายการรับฝากสินค้า (IN) ═══════ */}
        {deposit && (
          <div className="cp-form">
            <div className="cp-company">{COMPANY}</div>
            <div className="cp-title">ใบรับเก้าฝ่ายสินค้า</div>
            <div className="cp-doc-row">
              <span></span>
              <span>เลขที่เอกสาร <b>{deposit.doc_ref || customer.document_no || '___________'}</b></span>
            </div>

            <div className="cp-info-grid">
              <div className="cp-info-row"><span className="cp-label">ลูกค้า</span><span className="cp-value cp-dotted">{customer.customer_name}</span></div>
              <div className="cp-info-row"><span className="cp-label">ที่อยู่</span><span className="cp-value cp-dotted">{customer.address || ''}</span></div>
              <div className="cp-info-row-split">
                <span></span>
                <span>เบอร์โทร <span className="cp-dotted-inline">{customer.phone || ''}</span></span>
              </div>
            </div>

            <div className="cp-section-label">รายการรับฝากสินค้า</div>

            <table className="cp-table">
              <thead>
                <tr>
                  <th rowSpan={2} style={{ width: 40 }}>ลำดับ</th>
                  <th rowSpan={2}>วันที่รับ</th>
                  <th rowSpan={2}>รายการ</th>
                  <th rowSpan={2}>LOT No.</th>
                  <th colSpan={2}>Total G/W</th>
                  <th colSpan={2}>N/W:UNIT</th>
                  <th rowSpan={2}>เวลา</th>
                  <th rowSpan={2}>หมายเหตุ</th>
                </tr>
                <tr>
                  <th>กล่อง</th><th>(Kg.)</th>
                  <th>กล่อง</th><th>(Kg.)</th>
                </tr>
              </thead>
              <tbody>
                {depItems.map((it, i) => (
                  <tr key={it.id}>
                    <td className="text-center">{it.seq_no || i + 1}</td>
                    <td>{toDate(it.receive_date)}</td>
                    <td>{it.item_name}</td>
                    <td>{it.lot_no || ''}</td>
                    <td className="num-cell">{it.boxes || ''}</td>
                    <td className="num-cell">{it.weight_kg ? Number(it.weight_kg).toFixed(2) : ''}</td>
                    <td className="num-cell">-</td>
                    <td className="num-cell">{it.nw_unit ? Number(it.nw_unit).toFixed(2) : ''}</td>
                    <td>{it.time_str || ''}</td>
                    <td>{it.remark || ''}</td>
                  </tr>
                ))}
                {fillBlanks(depItems, BLANK_ROWS).map(i => (
                  <tr key={`b${i}`}><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={4} className="text-right"><b></b></td>
                  <td className="num-cell"><b>{depTotalBoxes || ''}</b></td>
                  <td className="num-cell"><b>{depTotalKg ? depTotalKg.toFixed(2) : ''}</b></td>
                  <td colSpan={4}></td></tr>
              </tfoot>
            </table>

            <div className="cp-sig-row">
              <div className="cp-sig"><span className="cp-sig-label">ผู้รับฝากสินค้า</span><span className="cp-sig-line">{deposit.receiver_name || ''}</span></div>
              <div className="cp-sig"><span className="cp-sig-label">หมายเลข</span><span className="cp-sig-line"></span></div>
              <div className="cp-sig"><span className="cp-sig-label">จำนวน</span><span className="cp-sig-line">ลัง</span></div>
              <div className="cp-sig"><span className="cp-sig-label"></span><span className="cp-sig-line">หมายเหตุ</span></div>
            </div>
            <div className="cp-sig-row">
              <div className="cp-sig"><span className="cp-sig-label">ผู้รับสินค้าเพื่อ</span><span className="cp-sig-line">{deposit.receiver_name || ''}</span></div>
              <div className="cp-sig"><span className="cp-sig-label">ผู้ตรวจสอบ</span><span className="cp-sig-line">{deposit.inspector_name || ''}</span></div>
            </div>
          </div>
        )}

        {/* ═══════ รายการเบิกจ่ายสินค้า (OUT) ═══════ */}
        {withdrawal && (
          <div className="cp-form" style={{ marginTop: deposit ? 24 : 0 }}>
            {!deposit && (
              <>
                <div className="cp-company">{COMPANY}</div>
                <div className="cp-doc-row">
                  <span></span>
                  <span>เลขที่เอกสาร <b>{withdrawal.doc_ref || customer.document_no || '___________'}</b></span>
                </div>
                <div className="cp-info-grid">
                  <div className="cp-info-row"><span className="cp-label">ลูกค้า</span><span className="cp-value cp-dotted">{customer.customer_name}</span></div>
                  <div className="cp-info-row"><span className="cp-label">ที่อยู่</span><span className="cp-value cp-dotted">{customer.address || ''}</span></div>
                </div>
              </>
            )}

            <div className="cp-section-label">รายการเบิกจ่ายสินค้า</div>

            <table className="cp-table">
              <thead>
                <tr>
                  <th rowSpan={2} style={{ width: 40 }}>ลำดับ</th>
                  <th rowSpan={2}>วันที่รับ</th>
                  <th rowSpan={2}>รายการ</th>
                  <th rowSpan={2}>LOT No.</th>
                  <th rowSpan={2}>กล่อง</th>
                  <th colSpan={2}>Total G/W</th>
                  <th colSpan={2}>คงเหลือ</th>
                  <th rowSpan={2}>เวลา</th>
                  <th rowSpan={2}>หมายเหตุ</th>
                </tr>
                <tr>
                  <th>กล่อง</th><th>(Kg.)</th>
                  <th>กล่อง</th><th>(Kg.)</th>
                </tr>
              </thead>
              <tbody>
                {wdItems.map((it, i) => (
                  <tr key={it.id}>
                    <td className="text-center">{i + 1}</td>
                    <td>{toDate(it.receive_date)}</td>
                    <td>{it.item_name}</td>
                    <td>{it.lot_no || ''}</td>
                    <td className="num-cell">{it.boxes_out || ''}</td>
                    <td className="num-cell">{it.boxes_out || ''}</td>
                    <td className="num-cell">{it.weight_kg_out ? Number(it.weight_kg_out).toFixed(2) : ''}</td>
                    <td className="num-cell">{it.remaining_boxes != null ? it.remaining_boxes : ''}</td>
                    <td className="num-cell">{it.remaining_kg != null ? Number(it.remaining_kg).toFixed(2) : ''}</td>
                    <td>{it.time_str || ''}</td>
                    <td>{it.remark || ''}</td>
                  </tr>
                ))}
                {fillBlanks(wdItems, BLANK_ROWS).map(i => (
                  <tr key={`b${i}`}><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="text-right"><b></b></td>
                  <td className="num-cell"><b>{wdTotalBoxes || ''}</b></td>
                  <td className="num-cell"><b>{wdTotalBoxes || ''}</b></td>
                  <td className="num-cell"><b>{wdTotalKg ? wdTotalKg.toFixed(2) : ''}</b></td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            </table>

            <div className="cp-sig-row">
              <div className="cp-sig"><span className="cp-sig-label">ผู้เบิกจ่ายสินค้า</span><span className="cp-sig-line">{withdrawal.withdrawer_name || ''}</span></div>
              <div className="cp-sig"><span className="cp-sig-label">ผู้ตรวจสอบ</span><span className="cp-sig-line">{withdrawal.inspector_name || ''}</span></div>
            </div>
          </div>
        )}

        <div className="cp-footer">
          <span>{COMPANY}</span>
          <span>{DOC_FOOTER} ({toDate(new Date().toISOString())})</span>
        </div>
      </div>
    </>
  );
}

export default CustomerPrint;
