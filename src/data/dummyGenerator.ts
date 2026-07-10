import { Area, Building, Wing, Flat, Paper, Subscription, DeliveryAgent, DeliveryLog, BillingSummary } from '../types';

export interface DatabaseState {
  areas: Area[];
  buildings: Building[];
  wings: Wing[];
  flats: Flat[];
  papers: Paper[];
  subscriptions: Subscription[];
  agents: DeliveryAgent[];
  deliveryLogs: DeliveryLog[];
}

export function generateInitialData(): DatabaseState {
  const areas: Area[] = [
    { id: 'area_1', name: 'Skyline Meadows' },
    { id: 'area_2', name: 'Emerald Heights' },
    { id: 'area_3', name: 'Riverview Avenue' },
    { id: 'area_4', name: 'Orchard Garden' },
    { id: 'area_5', name: 'Highland Boulevard' },
  ];

  const buildings: Building[] = [
    { id: 'b_1', areaId: 'area_1', name: 'Sky Tower A' },
    { id: 'b_2', areaId: 'area_1', name: 'Sky Tower B' },
    { id: 'b_3', areaId: 'area_2', name: 'Emerald Crest' },
    { id: 'b_4', areaId: 'area_2', name: 'Jade Pavilion' },
    { id: 'b_5', areaId: 'area_3', name: 'River Plaza' },
    { id: 'b_6', areaId: 'area_3', name: 'Avenue Arcade' },
    { id: 'b_7', areaId: 'area_4', name: 'Orchard Block 1' },
    { id: 'b_8', areaId: 'area_4', name: 'Orchard Block 2' },
    { id: 'b_9', areaId: 'area_5', name: 'Highland Manor' },
    { id: 'b_10', areaId: 'area_5', name: 'Apex Residency' },
  ];

  const wings: Wing[] = [];
  buildings.forEach((b) => {
    // Generate 2 wings for each building
    wings.push({ id: `w_${b.id}_A`, buildingId: b.id, name: 'Wing A' });
    wings.push({ id: `w_${b.id}_B`, buildingId: b.id, name: 'Wing B' });
  });

  const flats: Flat[] = [];
  const firstNames = ['Aarav', 'Vihaan', 'Aditya', 'Sai', 'Arjun', 'Ananya', 'Diya', 'Ira', 'Kiara', 'Kavya', 'Rohan', 'Sneha', 'Meera', 'Pooja', 'Rahul', 'Siddharth', 'Varun', 'Neha', 'Rhea', 'Amit'];
  const lastNames = ['Sharma', 'Patel', 'Verma', 'Gupta', 'Iyer', 'Reddy', 'Kumar', 'Singh', 'Joshi', 'Mehta', 'Nair', 'Rao', 'Choudhury', 'Bose', 'Das', 'Sen', 'Mishra', 'Trivedi', 'Shah', 'Kapoor'];

  let flatCounter = 1;
  wings.forEach((w) => {
    // Generate 8 flats per wing (4 floors, 2 flats per floor e.g. 101, 102, 201, 202, etc.)
    const floors = [1, 2, 3, 4];
    floors.forEach((floor) => {
      [1, 2].forEach((flatNum) => {
        const id = `f_${flatCounter++}`;
        const nameIdx = Math.floor((id.charCodeAt(id.length - 1) + flatCounter) % firstNames.length);
        const surnameIdx = Math.floor((flatCounter * 3) % lastNames.length);
        const customerName = `${firstNames[nameIdx]} ${lastNames[surnameIdx]}`;
        const phoneSuffix = Math.floor(10000000 + Math.random() * 90000000);
        const phoneNumber = `+91 9${phoneSuffix}`;

        flats.push({
          id,
          wingId: w.id,
          flatNumber: `${floor}0${flatNum}`,
          customerName,
          phoneNumber,
          activeYear: 2026,
        });
      });
    });
  });

  const papers: Paper[] = [
    { id: 'p_1', name: 'The Times of India', ratePerDay: 5.5 },
    { id: 'p_2', name: 'The Hindu', ratePerDay: 6.0 },
    { id: 'p_3', name: 'The Economic Times', ratePerDay: 7.5 },
    { id: 'p_4', name: 'The Indian Express', ratePerDay: 5.0 },
    { id: 'p_5', name: 'Business Standard', ratePerDay: 8.0 },
  ];

  const agents: DeliveryAgent[] = [
    { id: 'a_1', name: 'Suresh Kumar', phone: '+91 98765 43210', assignedAreaId: 'area_1' },
    { id: 'a_2', name: 'Ramesh Patel', phone: '+91 98765 43211', assignedAreaId: 'area_2' },
    { id: 'a_3', name: 'Karan Singh', phone: '+91 98765 43212', assignedAreaId: 'area_3' },
    { id: 'a_4', name: 'Deepak Sharma', phone: '+91 98765 43213', assignedAreaId: 'area_4' },
    { id: 'a_5', name: 'Vikram Rao', phone: '+91 98765 43214', assignedAreaId: 'area_5' },
  ];

  const subscriptions: Subscription[] = [];
  flats.forEach((f, idx) => {
    // 1st paper (everyone gets at least one paper)
    const primaryPaperIdx = idx % papers.length;
    subscriptions.push({
      id: `sub_${f.id}_1`,
      flatId: f.id,
      paperId: papers[primaryPaperIdx].id,
      active: true,
    });

    // 40% of flats have a second paper (e.g. business paper)
    if (idx % 5 < 2) {
      const secondaryPaperIdx = (primaryPaperIdx + 2) % papers.length;
      subscriptions.push({
        id: `sub_${f.id}_2`,
        flatId: f.id,
        paperId: papers[secondaryPaperIdx].id,
        active: true,
      });
    }
  });

  // Let's pre-generate Delivery Logs for June 2026 (30 days) and July 1 to 9, 2026 (9 days)
  const deliveryLogs: DeliveryLog[] = [];
  
  // To avoid performance lagging during generation but still give massive stress-test logs,
  // let's create a solid seed of logs.
  // We want at least 500+ records explicitly requested, let's create a robust set.
  // Let's generate for June (30 days) and July (10 days).
  // Flats = 160. Subscriptions = ~220. 
  // 40 days * 220 = ~8,800 records! This is perfect and runs super fast in JS.
  const dateRanges: string[] = [];
  // June 2026
  for (let d = 1; d <= 30; d++) {
    const dayStr = d < 10 ? `0${d}` : `${d}`;
    dateRanges.push(`2026-06-${dayStr}`);
  }
  // July 2026 (1 to 9)
  for (let d = 1; d <= 9; d++) {
    const dayStr = d < 10 ? `0${d}` : `${d}`;
    dateRanges.push(`2026-07-${dayStr}`);
  }

  let logCounter = 1;
  subscriptions.forEach((sub) => {
    const skipSeed = (parseInt(sub.flatId.split('_')[1]) + parseInt(sub.paperId.split('_')[1])) % 10;
    
    dateRanges.forEach((date) => {
      // Skips occur on certain dates based on the seed to make it realistic
      // Let's say skip is true if date-based math matches skipSeed (e.g. 10% skips)
      const day = parseInt(date.split('-')[2]);
      const isSkip = (day % 15 === skipSeed);
      
      deliveryLogs.push({
        id: `log_${logCounter++}`,
        flatId: sub.flatId,
        paperId: sub.paperId,
        date,
        status: isSkip ? 'SKIPPED' : 'DELIVERED',
      });
    });
  });

  return {
    areas,
    buildings,
    wings,
    flats,
    papers,
    subscriptions,
    agents,
    deliveryLogs,
  };
}

export function calculateBill(
  flat: Flat,
  month: number,
  year: number,
  state: DatabaseState
): BillingSummary {
  const { papers, subscriptions, deliveryLogs, wings, buildings, areas } = state;

  // Find geographic hierarchy path
  const wing = wings.find((w) => w.id === flat.wingId);
  const building = wing ? buildings.find((b) => b.id === wing.buildingId) : null;
  const area = building ? areas.find((a) => a.id === building.areaId) : null;
  const locationPath = `${area?.name || ''} ➔ ${building?.name || ''} ➔ ${wing?.name || ''} ➔ Flat ${flat.flatNumber}`;

  // Find subscribed papers for this flat
  const flatSubs = subscriptions.filter((s) => s.flatId === flat.id && s.active);
  const activePaperIds = flatSubs.map((s) => s.paperId);
  const flatPapers = papers.filter((p) => activePaperIds.includes(p.id));

  // Get date range for target month
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStr = month < 10 ? `0${month}` : `${month}`;
  
  const subscribedPapersBreakdown = flatPapers.map((paper) => {
    let deliveredCount = 0;
    let skippedCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const dateStr = `${year}-${monthStr}-${dayStr}`;

      const log = deliveryLogs.find(
        (l) => l.flatId === flat.id && l.paperId === paper.id && l.date === dateStr
      );

      if (log) {
        if (log.status === 'DELIVERED') {
          deliveredCount++;
        } else {
          skippedCount++;
        }
      } else {
        // Default to delivered if no log is found (assuming default daily delivery)
        deliveredCount++;
      }
    }

    const cost = deliveredCount * paper.ratePerDay;

    return {
      paperName: paper.name,
      rate: paper.ratePerDay,
      deliveredDays: deliveredCount,
      skippedDays: skippedCount,
      cost,
    };
  });

  const totalDelivered = subscribedPapersBreakdown.reduce((acc, p) => acc + p.deliveredDays, 0);
  const totalSkipped = subscribedPapersBreakdown.reduce((acc, p) => acc + p.skippedDays, 0);
  
  // Gross Amount: (Delivered + Skipped) * Rate (Standard billing potential)
  // Deductions: Skipped * Rate
  // Net Amount: Delivered * Rate
  const grossAmount = subscribedPapersBreakdown.reduce((acc, p) => acc + (p.deliveredDays + p.skippedDays) * p.rate, 0);
  const skipDeductions = subscribedPapersBreakdown.reduce((acc, p) => acc + p.skippedDays * p.rate, 0);
  const netAmount = grossAmount - skipDeductions;

  // Invoice payment status is simulated. Even flat IDs are paid, odd are unpaid for illustration, but modifiable by user.
  const flatSeed = parseInt(flat.id.split('_')[1] || '0');
  const paid = (flatSeed + month) % 3 !== 0; // Realistic mix of paid and unpaid

  return {
    flatId: flat.id,
    customerName: flat.customerName,
    flatNumber: flat.flatNumber,
    locationPath,
    month,
    year,
    subscribedPapers: subscribedPapersBreakdown,
    totalDelivered,
    totalSkipped,
    grossAmount,
    skipDeductions,
    netAmount,
    paid,
  };
}
