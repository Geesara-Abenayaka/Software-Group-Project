import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Program from './models/Program.js';

dotenv.config();

const connectDB = async () => {
  try {
    const dbUsername = 'adminpanel';
    const dbPassword = 'eAVM89vSCbATi8Tv';
    const connectionString = `mongodb+srv://${dbUsername}:${dbPassword}@cluster0.mgyo1zg.mongodb.net/POST_GRADUATE_LMS_DB?appName=Cluster0`;
    
    await mongoose.connect(connectionString);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const seedPrograms = async () => {
  try {
    // Drop the collection to start fresh
    await mongoose.connection.dropCollection('programs').catch(() => {
      console.log('Programs collection does not exist yet, creating new...');
    });
    
    console.log('Programs collection cleared');

    // Create postgraduate programs based on the images
    const programs = [
      {
        title: 'MSc in CS',
        shortCode: 'msc-cs',
        description: 'An advanced program covering theoretical and practical aspects of computer science, including',
        detailedDescription: 'MSc in CS degree program is a comprehensive advanced program that covers both theoretical and practical aspects of computer science, preparing students for careers in software development, research, and technology leadership.',
        deadline: '05th November 2025',
        resourcesCount: 3,
        specializations: [
          { name: 'Software Engineering' },
          { name: 'Artificial Intelligence' },
          { name: 'Cybersecurity' }
        ],
        deadlines: {
          application: '05th November 2025',
          selectionExams: '08th and 09th November 2025'
        },
        resources: [
          {
            name: 'MSc in CS - Course Details',
            type: 'pdf',
            fileSize: '6.1 KB',
            url: '/resources/msc-cs-details.pdf'
          },
          {
            name: 'Call for Application',
            type: 'pdf',
            fileSize: '718 KB',
            url: '/resources/msc-cs-application.pdf'
          },
          {
            name: 'Online Application',
            type: 'form',
            url: '/apply/msc-cs'
          }
        ],
        color: '#6B7280'
      },
      {
        title: 'MBA in eGovernance',
        shortCode: 'mba-egov',
        description: 'This program focuses on the application of information technology in government',
        detailedDescription: 'MBA in eGovernance program focuses on the strategic application of information technology in government operations, digital transformation, and public sector management.',
        deadline: '05th November 2025',
        resourcesCount: 3,
        specializations: [
          { name: 'Digital Government' },
          { name: 'Public Policy & IT' }
        ],
        deadlines: {
          application: '05th November 2025',
          selectionExams: '08th and 09th November 2025'
        },
        resources: [
          {
            name: 'MBA in eGovernance - Course Details',
            type: 'pdf',
            fileSize: '5.8 KB',
            url: '/resources/mba-egov-details.pdf'
          },
          {
            name: 'Call for Application',
            type: 'pdf',
            fileSize: '720 KB',
            url: '/resources/mba-egov-application.pdf'
          },
          {
            name: 'Online Application',
            type: 'form',
            url: '/apply/mba-egov'
          }
        ],
        color: '#6B7280'
      },
      {
        title: 'MSc in DS & AI',
        shortCode: 'msc-ds-ai',
        description: 'A comprehensive program that combines advanced data science techniques with artificial',
        detailedDescription: 'MSc in DS & AI is a comprehensive program that combines cutting-edge data science techniques with artificial intelligence, machine learning, and deep learning methodologies.',
        deadline: '05th November 2025',
        resourcesCount: 3,
        specializations: [
          { name: 'Machine Learning' },
          { name: 'Deep Learning' },
          { name: 'Big Data Analytics' }
        ],
        deadlines: {
          application: '05th November 2025',
          selectionExams: '08th and 09th November 2025'
        },
        resources: [
          {
            name: 'MSc in DS & AI - Course Details',
            type: 'pdf',
            fileSize: '6.3 KB',
            url: '/resources/msc-ds-ai-details.pdf'
          },
          {
            name: 'Call for Application',
            type: 'pdf',
            fileSize: '722 KB',
            url: '/resources/msc-ds-ai-application.pdf'
          },
          {
            name: 'Online Application',
            type: 'form',
            url: '/apply/msc-ds-ai'
          }
        ],
        color: '#6B7280'
      },
      {
        title: 'MBA in IT',
        shortCode: 'mba-it',
        description: 'MBA in IT degree program combine the very best of general MBA programs with specialist knowledge in application of IT in management.',
        detailedDescription: 'MBA in IT degree program combine the very best of general MBA programs with specialist knowledge in application of IT in management.',
        deadline: '05th November 2025',
        resourcesCount: 5,
        specializations: [
          { name: 'Business Analytics' },
          { name: 'Information Technology' }
        ],
        deadlines: {
          application: 'Deadline - 05th November 2025',
          selectionExams: 'Selection Exams and Interviews - 08th and 09th November 2025'
        },
        resources: [
          {
            name: 'MBA in IT - Course Details',
            type: 'pdf',
            fileSize: '6.1 KB',
            url: '/resources/mba-it-details.pdf'
          },
          {
            name: 'Call for Application',
            type: 'pdf',
            fileSize: '718 KB',
            url: '/resources/mba-it-application.pdf'
          },
          {
            name: 'Online Application',
            type: 'form',
            url: '/apply/mba-it'
          },
          {
            name: 'Employer Consent Letter',
            type: 'pdf',
            fileSize: '452 KB, Doc (18 KB)',
            url: '/resources/mba-it-employer-consent.pdf'
          },
          {
            name: 'Online Referee Form',
            type: 'form',
            url: '/referee/mba-it'
          }
        ],
        color: '#6B7280'
      },
      {
        title: 'Master of DS & AI',
        shortCode: 'master-ds-ai',
        description: 'A professional master\'s program designed for working professionals, focusing on practical applications',
        detailedDescription: 'A professional master\'s program designed for working professionals, focusing on practical applications of data science and artificial intelligence in industry settings.',
        deadline: '05th November 2025',
        resourcesCount: 3,
        specializations: [
          { name: 'Applied Data Science' },
          { name: 'AI for Business' }
        ],
        deadlines: {
          application: '05th November 2025',
          selectionExams: '08th and 09th November 2025'
        },
        resources: [
          {
            name: 'Master of DS & AI - Course Details',
            type: 'pdf',
            fileSize: '6.2 KB',
            url: '/resources/master-ds-ai-details.pdf'
          },
          {
            name: 'Call for Application',
            type: 'pdf',
            fileSize: '719 KB',
            url: '/resources/master-ds-ai-application.pdf'
          },
          {
            name: 'Online Application',
            type: 'form',
            url: '/apply/master-ds-ai'
          }
        ],
        color: '#6B7280'
      }
    ];

    // Insert all programs
    const createdPrograms = await Program.insertMany(programs);
    console.log(`✅ ${createdPrograms.length} programs seeded successfully`);
    
    // Display created programs
    createdPrograms.forEach(program => {
      console.log(`  - ${program.title} (${program.shortCode})`);
    });

  } catch (error) {
    console.error('Error seeding programs:', error);
  }
};

const runSeed = async () => {
  await connectDB();
  await seedPrograms();
  console.log('Seeding completed!');
  process.exit(0);
};

runSeed();
