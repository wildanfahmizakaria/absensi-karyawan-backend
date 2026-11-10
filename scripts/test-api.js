const http = require('http');
const app = require('../src/app');

async function runTests() {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  console.log(`Starting API test on temporary port ${port}...`);

  function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(baseUrl + path);
      const headers = {};

      let payload = null;
      if (body) {
        payload = JSON.stringify(body);
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = Buffer.byteLength(payload);
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const req = http.request(url, { method, headers }, (res) => {
        let responseBody = '';
        res.on('data', chunk => responseBody += chunk);
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(responseBody);
          } catch {
            parsed = responseBody;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      });

      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✔ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    console.log('\n1. Test Health Endpoint:');
    const health = await request('GET', '/health');
    assert(health.status === 200 && health.body.status === 'OK', 'GET /health returns 200 OK');

    // 2. Login Superadmin
    console.log('\n2. Test Login Superadmin:');
    const saLogin = await request('POST', '/auth/login', {
      email: 'superadmin@mandalamahardika.com',
      password: 'password123'
    });
    assert(saLogin.status === 200 && saLogin.body.data.token, 'Superadmin login returns valid token');
    const saToken = saLogin.body.data.token;

    // 3. Login Employee
    console.log('\n3. Test Login Employee:');
    const empLogin = await request('POST', '/auth/login', {
      email: 'budi.santoso@mandalamahardika.com',
      password: 'password123'
    });
    assert(empLogin.status === 200 && empLogin.body.data.user.role === 'EMPLOYEE', 'Employee login returns EMPLOYEE role');
    const empToken = empLogin.body.data.token;

    // 4. Test Auth /me
    console.log('\n4. Test Auth /me:');
    const meRes = await request('GET', '/auth/me', null, empToken);
    assert(meRes.status === 200 && meRes.body.data.user.employee_code === 'EMP-001', 'Auth /me returns profile');

    // 5. Test Employee Dashboard
    console.log('\n5. Test Employee Dashboard:');
    const empDash = await request('GET', '/dashboard/employee', null, empToken);
    assert(empDash.status === 200 && empDash.body.data.monthly_summary, 'Employee dashboard returns monthly stats');

    // 6. Test Today Attendance Status
    console.log('\n6. Test Attendance Today Status:');
    const todayRes = await request('GET', '/attendance/today', null, empToken);
    assert(todayRes.status === 200 && todayRes.body.data.has_active_session !== undefined, 'Attendance today returns active status');

    // 7. Test Attendance History
    console.log('\n7. Test Attendance History:');
    const historyRes = await request('GET', '/attendance', null, empToken);
    assert(historyRes.status === 200 && Array.isArray(historyRes.body.data), 'Attendance history returns list of records');

    // 8. Test Admin Dashboard
    console.log('\n8. Test Admin Dashboard:');
    const adminDash = await request('GET', '/dashboard/admin', null, saToken);
    assert(adminDash.status === 200 && adminDash.body.data.kpi, 'Admin dashboard returns operational KPIs');

    // 9. Test Admin Employees List
    console.log('\n9. Test Admin Employee List:');
    const empList = await request('GET', '/admin/employees', null, saToken);
    assert(empList.status === 200 && empList.body.data.length >= 5, 'Admin employees returns list of employees');

    // 10. Test Role Authorization Guard (Employee accessing Admin route)
    console.log('\n10. Test Role Security Guard:');
    const forbiddenRes = await request('GET', '/admin/employees', null, empToken);
    assert(forbiddenRes.status === 403 && forbiddenRes.body.error.code === 'FORBIDDEN', 'Employee blocked from admin route with 403 FORBIDDEN');

    // 11. Test Report JSON
    console.log('\n11. Test Report Query:');
    const reportRes = await request('GET', '/admin/reports/attendance', null, saToken);
    assert(reportRes.status === 200 && reportRes.body.data.summary, 'Report endpoint returns summary and records');

    // 12. Test CSV Export
    console.log('\n12. Test Report CSV Export:');
    const csvRes = await request('GET', '/admin/reports/attendance/export?format=csv', null, saToken);
    assert(csvRes.status === 200 && csvRes.headers['content-type'].includes('text/csv'), 'Report CSV export returns text/csv');

    // 13. Test PDF Export
    console.log('\n13. Test Report PDF Export:');
    const pdfRes = await request('GET', '/admin/reports/attendance/export?format=pdf', null, saToken);
    assert(pdfRes.status === 200 && pdfRes.headers['content-type'].includes('application/pdf'), 'Report PDF export returns application/pdf');

    // 14. Test Work Schedule Settings
    console.log('\n14. Test Work Schedule Settings:');
    const settingsRes = await request('GET', '/admin/settings/work-schedule', null, saToken);
    assert(
      settingsRes.status === 200 && 
      settingsRes.body.data.work_schedule.minimum_work_duration_minutes === 510,
      'Settings returns minimum_work_duration_minutes = 510'
    );

    // 15. Test Audit Logs
    console.log('\n15. Test Audit Logs:');
    const auditRes = await request('GET', '/admin/audit-logs', null, saToken);
    assert(auditRes.status === 200 && Array.isArray(auditRes.body.data), 'Audit logs returns list of logs');

    console.log(`\n================================`);
    console.log(`Total tests: ${passed + failed}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`================================`);
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    server.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();

