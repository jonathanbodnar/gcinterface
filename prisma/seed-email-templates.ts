import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedEmailTemplates() {
  console.log('📧 Seeding email templates...\n');

  // RFQ Template
  const rfqTemplate = await prisma.emailTemplate.upsert({
    where: {
      id: 'template-rfq-default',
    },
    update: {},
    create: {
      id: 'template-rfq-default',
      name: 'Default RFQ Template',
      type: 'RFQ',
      subject: 'Request for Quote - {{projectName}} - RFQ #{{rfqNumber}}',
      body: '
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: #2563eb; color: white; padding: 20px; }
    .content { padding: 20px; }
    .project-info { background-color: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .materials-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .materials-table th { background-color: #e5e7eb; padding: 12px; text-align: left; border: 1px solid #d1d5db; }
    .materials-table td { padding: 12px; border: 1px solid #d1d5db; }
    .materials-table tr:nth-child(even) { background-color: #f9fafb; }
    .footer { background-color: #f3f4f6; padding: 20px; margin-top: 30px; text-align: center; color: #6b7280; }
    .important { color: #dc2626; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Request for Quote</h1>
    <p>RFQ #{{rfqNumber}}</p>
  </div>
  
  <div class="content">
    <p>Dear {{vendorName}},</p>
    
    <p>We are requesting your competitive quote for the following project:</p>
    
    <div class="project-info">
      <h3>Project Information</h3>
      <p><strong>Project Name:</strong> {{projectName}}</p>
      <p><strong>Location:</strong> {{projectLocation}}</p>
      <p><strong>Total Area:</strong> {{totalSF}} SF</p>
      <p><strong>Trade(s):</strong> {{trade}}</p>
      <p class="important"><strong>Quote Due Date:</strong> {{dueDate}}</p>
    </div>

    <h3>Scope of Work</h3>
    <p>Please provide pricing for the following materials and/or services:</p>

    <table class="materials-table">
      <thead>
        <tr>
          <th>Item #</th>
          <th>Description</th>
          <th>Quantity</th>
          <th>Unit</th>
          <th>Your Unit Price</th>
          <th>Total Price</th>
        </tr>
      </thead>
      <tbody>
        {{materialsTable}}
      </tbody>
    </table>

    <h3>Quote Requirements</h3>
    <ul>
      <li>Please provide pricing for each line item above</li>
      <li>Include any <strong>value engineering alternatives</strong> you recommend</li>
      <li>Specify lead times for materials/equipment</li>
      <li>Include any applicable warranties</li>
      <li>Note payment terms (Net 30, Net 60, etc.)</li>
      <li>Provide any clarifications or exclusions</li>
    </ul>

    <h3>How to Submit</h3>
    <p>Please reply to this email with your quote by <strong>{{dueDate}}</strong>. Include:</p>
    <ul>
      <li>Itemized pricing for each material</li>
      <li>Any value engineering alternatives</li>
      <li>Your proposed payment terms</li>
      <li>Expected delivery/installation timeline</li>
    </ul>

    <p>If you have questions, please contact:</p>
    <p><strong>{{contactName}}</strong><br/>
    Email: {{contactEmail}}<br/>
    Phone: {{contactPhone}}</p>

    <p>We look forward to receiving your quote.</p>

    <p>Best regards,<br/>
    {{contactName}}<br/>
    GC Legacy Construction</p>
  </div>

  <div class="footer">
    <p>This RFQ was sent via GC Interface - Post-Takeoff Estimation & Procurement Platform</p>
    <p>RFQ #{{rfqNumber}} | {{projectName}}</p>
  </div>
</body>
</html>
      ',
      active: true,
    },
  });
  console.log('✅ RFQ Template created');

  // Award Template
  const awardTemplate = await prisma.emailTemplate.upsert({
    where: {
      id: 'template-award-default',
    },
    update: {},
    create: {
      id: 'template-award-default',
      name: 'Default Award Template',
      type: 'AWARD',
      subject: 'Congratulations! Subcontract Award - {{projectName}} - {{contractNumber}}',
      body: '
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: #16a34a; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .award-box { background-color: #dcfce7; border-left: 4px solid #16a34a; padding: 20px; margin: 20px 0; }
    .contract-info { background-color: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .materials-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .materials-table th { background-color: #e5e7eb; padding: 12px; text-align: left; border: 1px solid #d1d5db; }
    .materials-table td { padding: 12px; border: 1px solid #d1d5db; }
    .amount { font-size: 24px; color: #16a34a; font-weight: bold; }
    .footer { background-color: #f3f4f6; padding: 20px; margin-top: 30px; color: #6b7280; }
    .next-steps { background-color: #fef3c7; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 Congratulations!</h1>
    <h2>You've Been Awarded the Subcontract</h2>
  </div>
  
  <div class="content">
    <p>Dear {{vendorName}},</p>
    
    <div class="award-box">
      <h3>✨ Award Notification</h3>
      <p>We are pleased to inform you that your quote has been <strong>ACCEPTED</strong> for the following project:</p>
    </div>

    <div class="contract-info">
      <h3>Contract Details</h3>
      <p><strong>Project Name:</strong> {{projectName}}</p>
      <p><strong>Project Location:</strong> {{projectLocation}}</p>
      <p><strong>Contract Number:</strong> {{contractNumber}}</p>
      <p><strong>Trade:</strong> {{trade}}</p>
      <p class="amount"><strong>Contract Amount:</strong> $\{{contractAmount}}</p>
      <p><strong>Payment Terms:</strong> {{paymentTerms}}</p>
    </div>

    <h3>Scope of Work</h3>
    <div style="white-space: pre-wrap; background-color: #f9fafb; padding: 15px; border-radius: 5px;">{{scopeOfWork}}</div>

    <h3>Materials Included</h3>
    <table class="materials-table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Description</th>
          <th>Quantity</th>
          <th>Unit Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {{materialsTable}}
      </tbody>
    </table>

    <div class="next-steps">
      <h3>⚡ Next Steps</h3>
      <ol>
        <li><strong>Review attached subcontract agreement</strong></li>
        <li><strong>Sign and return</strong> within 5 business days</li>
        <li><strong>Provide insurance certificates</strong> (General Liability, Workers Comp)</li>
        <li><strong>Attend preconstruction meeting</strong> (date TBD)</li>
        <li><strong>Submit schedule and submittals</strong> per contract requirements</li>
      </ol>
    </div>

    <h3>Project Schedule</h3>
    <p><strong>Estimated Start Date:</strong> {{startDate}}</p>
    <p><strong>Substantial Completion:</strong> {{completionDate}}</p>
    <p>Detailed project schedule attached separately.</p>

    <h3>Key Requirements</h3>
    <ul>
      <li>All work must comply with project specifications and approved shop drawings</li>
      <li>Provide all materials per manufacturer specifications</li>
      <li>Coordinate with other trades as required</li>
      <li>Maintain clean and safe work areas</li>
      <li>Obtain all necessary permits and inspections</li>
    </ul>

    <p><strong>Congratulations again on winning this subcontract!</strong> We look forward to working with you on this project.</p>

    <p>Please contact me with any questions:</p>
    <p><strong>{{contactName}}</strong><br/>
    Project Manager<br/>
    Email: {{contactEmail}}<br/>
    Phone: {{contactPhone}}</p>

    <p>Best regards,<br/>
    {{contactName}}<br/>
    GC Legacy Construction</p>
  </div>

  <div class="footer">
    <p>GC Legacy Construction | Contract #{{contractNumber}}</p>
    <p>{{projectName}} | {{projectLocation}}</p>
  </div>
</body>
</html>
      ',
      active: true,
    },
  });
  console.log('✅ Award Template created');

  // Non-Award Template
  const nonAwardTemplate = await prisma.emailTemplate.upsert({
    where: {
      id: 'template-nonaward-default',
    },
    update: {},
    create: {
      id: 'template-nonaward-default',
      name: 'Default Non-Award Template',
      type: 'NON_AWARD',
      subject: 'Thank You for Your Quote - {{projectName}}',
      body: '
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: #6b7280; color: white; padding: 20px; }
    .content { padding: 20px; }
    .info-box { background-color: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .footer { background-color: #f3f4f6; padding: 20px; margin-top: 30px; text-align: center; color: #6b7280; }
    .highlight { background-color: #fef3c7; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Thank You for Your Proposal</h1>
  </div>
  
  <div class="content">
    <p>Dear {{vendorName}},</p>
    
    <p>Thank you for taking the time to submit your quote for our project:</p>

    <div class="info-box">
      <p><strong>Project Name:</strong> {{projectName}}</p>
      <p><strong>RFQ Number:</strong> {{rfqNumber}}</p>
      <p><strong>Quote Number:</strong> {{quoteNumber}}</p>
    </div>

    <p>We appreciate the effort you put into preparing your proposal and your interest in working with GC Legacy Construction.</p>

    <p>After careful evaluation of all submissions, we have decided to move forward with another vendor for this particular project. This decision was based on multiple factors including pricing, schedule, and project-specific requirements.</p>

    <div class="highlight">
      <h3>🤝 We Value Our Relationship</h3>
      <p><strong>We would very much like to work with you on future projects.</strong></p>
      <ul>
        <li>Your quote was competitive and professionally presented</li>
        <li>We will keep your information on file for future opportunities</li>
        <li>We encourage you to quote on our upcoming projects</li>
        <li>We appreciate your responsiveness and professionalism</li>
      </ul>
    </div>

    <p><strong>Upcoming Opportunities:</strong></p>
    <p>We have several projects in the pipeline that may align well with your capabilities. We will reach out when we have opportunities that match your trades and services.</p>

    <p>If you have any questions about this decision or would like feedback on your quote, please feel free to contact me.</p>

    <p>Thank you again for your time and effort. We look forward to the opportunity to work together on a future project.</p>

    <p>Best regards,<br/>
    {{contactName}}<br/>
    Project Manager<br/>
    GC Legacy Construction<br/>
    Email: {{contactEmail}}<br/>
    Phone: {{contactPhone}}</p>
  </div>

  <div class="footer">
    <p>GC Legacy Construction</p>
    <p>Building the Future Together</p>
  </div>
</body>
</html>
      ',
      active: true,
    },
  });
  console.log('✅ Non-Award Template created');

  console.log('\n' + '='.repeat(60));
  console.log('📧 Email templates seeded successfully!\n');
  console.log(`✅ RFQ Template: ${rfqTemplate.name}`);
  console.log(`✅ Award Template: ${awardTemplate.name}`);
  console.log(`✅ Non-Award Template: ${nonAwardTemplate.name}`);
  console.log('='.repeat(60));
  console.log('\n✨ Templates ready to use in GC Interface!');
  console.log('📍 View/Edit at: Templates page\n');
}

seedEmailTemplates()
  .catch((e) => {
    console.error('❌ Error seeding templates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

