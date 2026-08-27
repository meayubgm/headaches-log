import journal from './meta/_journal.json';
import m0000 from './0000_faulty_silver_surfer.sql';
import m0001 from './0001_seed_headache_types.sql';
import m0002 from './0002_remove_cluster_headache_type.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002
    }
  }
  