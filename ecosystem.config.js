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
    instances: 2,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    env_file: './.env'
  }]
}
