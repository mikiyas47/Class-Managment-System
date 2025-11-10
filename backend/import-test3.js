import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

// Import routes
import departmentRoutes from './routes/department.routes.js';
import classRoutes from './routes/class.routes.js';
import adminRoutes from './routes/admin.routes.js';
import departmentHeadRoutes from './routes/departmentHead.routes.js';
import teacherRoutes from './routes/teacher.routes.js';
import studentRoutes from './routes/student.routes.js';
import courseRoutes from './routes/course.routes.js';
import announcementRoutes from './routes/announcement.routes.js';
import examRoutes from './routes/exam.routes.js';
import questionRoutes from './routes/question.routes.js';
import assignmentRoutes from './routes/assignment.routes.js';
import authRoutes from './routes/auth.routes.js';
import addStudentRoutes from './routes/addStudent.routes.js';

console.log('Import test 3 successful');