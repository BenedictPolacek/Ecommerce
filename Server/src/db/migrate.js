import { migrate } from './migrator.js';

// Usage: node src/db/migrate.js [up|down] [count]
// up runs all pending migrations, down rolls back the last one by default
const direction = process.argv[2] || 'up';
const count = process.argv[3] ? parseInt(process.argv[3], 10) : direction === 'down' ? 1 : Infinity;

async function main() {
  if (!['up', 'down'].includes(direction) || Number.isNaN(count)) {
    console.error('Usage: node src/db/migrate.js [up|down] [count]');
    process.exit(1);
  }

  const applied = await migrate({ direction, count });

  if (applied.length === 0) {
    console.log('No migrations to run.');
  } else {
    applied.forEach((m) =>
      console.log(`${direction === 'up' ? 'Applied' : 'Reverted'}: ${m.name}`)
    );
  }
}

main().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
