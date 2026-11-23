import prisma from './prisma.js';
import pool from './pool.js';
import { hashPassword } from '../utils/crypto.js';
import { problemsRepository } from '../modules/problems/problems.repository.js';
import type { CreateProblemInput } from '../modules/problems/problems.schemas.js';

const SEED_PROBLEMS: CreateProblemInput[] = [
  {
    title: 'Two Sum',
    difficulty: 'EASY',
    description:
      'Given an array of integers nums and an integer target, return the 0-based indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.',
    input_format:
      'First line contains two space-separated integers n and target.\nSecond line contains n space-separated integers representing nums.',
    output_format:
      'Print two space-separated integers representing the two 0-based indices in ascending order.',
    constraints: [
      { constraint_text: '2 <= nums.length <= 10^4' },
      { constraint_text: '-10^9 <= nums[i] <= 10^9' },
      { constraint_text: '-10^9 <= target <= 10^9' },
      { constraint_text: 'Only one valid answer exists.' },
    ],
    examples: [
      {
        example_input: '4 9\n2 7 11 15',
        example_output: '0 1',
        explanation: 'Because nums[0] + nums[1] == 9, we output 0 1.',
        position: 1,
      },
      {
        example_input: '3 6\n3 2 4',
        example_output: '1 2',
        explanation: 'Because nums[1] + nums[2] == 6, we output 1 2.',
        position: 2,
      },
    ],
    hints: [
      {
        hint_description:
          'A brute force approach checks every pair in O(n^2) time.',
        hint_level: 1,
      },
      {
        hint_description:
          'Can you store each visited number and its index in a hash map to look up target - nums[i] in O(1) time?',
        hint_level: 2,
      },
    ],
    tags: ['array', 'hash-table'],
    test_cases: [
      {
        input_data: '4 9\n2 7 11 15',
        expected_output: '0 1',
        is_sample: true,
        position: 1,
      },
      {
        input_data: '3 6\n3 2 4',
        expected_output: '1 2',
        is_sample: true,
        position: 2,
      },
      {
        input_data: '2 6\n3 3',
        expected_output: '0 1',
        is_sample: false,
        position: 3,
      },
      {
        input_data: '5 -1\n-3 4 3 90 -4',
        expected_output: '2 4',
        is_sample: false,
        position: 4,
      },
    ],
  },
  {
    title: 'Palindrome Number',
    difficulty: 'EASY',
    description:
      'Given an integer x, print true if x is a palindrome, and false otherwise. An integer is a palindrome when it reads the same forward and backward.',
    input_format: 'A single line containing an integer x.',
    output_format: 'Print true if x is a palindrome, otherwise print false.',
    constraints: [{ constraint_text: '-2^31 <= x <= 2^31 - 1' }],
    examples: [
      {
        example_input: '121',
        example_output: 'true',
        explanation:
          '121 reads as 121 from left to right and from right to left.',
        position: 1,
      },
      {
        example_input: '-121',
        example_output: 'false',
        explanation:
          'From left to right, it reads -121. From right to left, it becomes 121-. Therefore it is not a palindrome.',
        position: 2,
      },
    ],
    hints: [
      {
        hint_description:
          'Negative numbers can never be palindromes because of the leading minus sign.',
        hint_level: 1,
      },
    ],
    tags: ['math'],
    test_cases: [
      {
        input_data: '121',
        expected_output: 'true',
        is_sample: true,
        position: 1,
      },
      {
        input_data: '-121',
        expected_output: 'false',
        is_sample: true,
        position: 2,
      },
      {
        input_data: '10',
        expected_output: 'false',
        is_sample: false,
        position: 3,
      },
      {
        input_data: '1234321',
        expected_output: 'true',
        is_sample: false,
        position: 4,
      },
    ],
  },
  {
    title: 'Maximum Subarray Sum',
    difficulty: 'MEDIUM',
    description:
      'Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and print its sum.',
    input_format:
      'First line contains an integer n.\nSecond line contains n space-separated integers.',
    output_format: 'A single integer representing the maximum subarray sum.',
    constraints: [
      { constraint_text: '1 <= nums.length <= 10^5' },
      { constraint_text: '-10^4 <= nums[i] <= 10^4' },
    ],
    examples: [
      {
        example_input: '9\n-2 1 -3 4 -1 2 1 -5 4',
        example_output: '6',
        explanation: 'The subarray [4, -1, 2, 1] has the largest sum 6.',
        position: 1,
      },
    ],
    hints: [
      {
        hint_description:
          "Use Kadane's algorithm: maintain the maximum subarray sum ending at the current index.",
        hint_level: 1,
      },
    ],
    tags: ['array', 'dynamic-programming', 'divide-and-conquer'],
    test_cases: [
      {
        input_data: '9\n-2 1 -3 4 -1 2 1 -5 4',
        expected_output: '6',
        is_sample: true,
        position: 1,
      },
      {
        input_data: '1\n1',
        expected_output: '1',
        is_sample: false,
        position: 2,
      },
      {
        input_data: '5\n5 4 -1 7 8',
        expected_output: '23',
        is_sample: false,
        position: 3,
      },
    ],
  },
];

async function seed(): Promise<void> {
  console.log('Seeding Runivo database...');

  const passwordHash = await hashPassword('demo1234');
  const demoUser = await prisma.users.upsert({
    where: { email: 'demo@runivo.dev' },
    update: {
      name: 'Demo Coder',
      password_hash: passwordHash,
    },
    create: {
      username: 'democoder',
      name: 'Demo Coder',
      email: 'demo@runivo.dev',
      password_hash: passwordHash,
    },
  });
  console.log(`Seeded user: ${demoUser.username} (id=${demoUser.id})`);

  for (const problemData of SEED_PROBLEMS) {
    const existing = await problemsRepository.findByTitle(problemData.title);
    if (existing) {
      console.log(`Problem already exists, skipping: "${problemData.title}"`);
      continue;
    }

    const created = await problemsRepository.create(problemData, {
      onlySampleTestCases: false,
    });
    console.log(
      `Seeded problem: "${created.title}" (id=${created.id}, ${created.difficulty})`
    );
  }

  console.log('Database seeding completed!');
}

try {
  await seed();
} catch (error) {
  console.error('Database seed failed:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
  await pool.end();
}
