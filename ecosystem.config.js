module.exports = {
  apps: [{
    name: 'winter-cricket',
    script: 'npm',
    args: 'start',
    cwd: '/home/vmycnmyo/winterleague-cricket',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    // Single instance — avoids split logs across cluster workers
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',

    // PM2 log configuration — append mode, not truncated on restart
    error_file: './logs/pm2-err.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // Do NOT truncate logs on restart
    // PM2 appends by default; our app-level logger handles rotation

    time: true,
    env_file: './.env'
  }]
}
