process.env.SEED_STUDENT_PASSWORD ||= process.env.SEED_TEACHER_PASSWORD;
process.env.SEED_ADMIN_PASSWORD ||= process.env.SEED_TEACHER_PASSWORD;
require('./server');
