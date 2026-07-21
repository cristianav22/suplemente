import { SupplementLog } from '../types';

export class NotificationService {
  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notification');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return false;
  }

  static sendNotification(title: string, body: string) {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png'
      });
    }
  }

  static checkAndNotify(logs: SupplementLog[]) {
    // Only proceed if permissions are granted
    if (Notification.permission !== 'granted') return;

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    
    // Check which supplements were already taken today
    const takenToday = new Set(
      logs.filter(l => l.timestamp >= todayStart).map(l => l.name)
    );

    // Group previous days logs by name to find average time
    const pastLogs = logs.filter(l => l.timestamp < todayStart);
    const timesByName: Record<string, number[]> = {};

    pastLogs.forEach(log => {
      const d = new Date(log.timestamp);
      const minutesFromMidnight = d.getHours() * 60 + d.getMinutes();
      if (!timesByName[log.name]) {
        timesByName[log.name] = [];
      }
      timesByName[log.name].push(minutesFromMidnight);
    });

    const currentMinutes = today.getHours() * 60 + today.getMinutes();
    const notifiedKey = `notified_${todayStart}`;
    let alreadyNotified: string[] = [];
    try {
      const stored = localStorage.getItem(notifiedKey);
      if (stored) alreadyNotified = JSON.parse(stored);
    } catch(e) {}

    Object.entries(timesByName).forEach(([name, times]) => {
      if (takenToday.has(name) || alreadyNotified.includes(name)) return;

      // Calculate average time (simple mean for now)
      const avgMinutes = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      
      // If current time is within 30 minutes before the average time
      if (avgMinutes >= currentMinutes && avgMinutes - currentMinutes <= 30) {
        this.sendNotification(
          "Hora de tus suplementos", 
          `Es casi la hora de tomar: ${name}. Suele ser alrededor de las ${Math.floor(avgMinutes / 60).toString().padStart(2, '0')}:${(avgMinutes % 60).toString().padStart(2, '0')}.`
        );
        alreadyNotified.push(name);
      }
    });

    localStorage.setItem(notifiedKey, JSON.stringify(alreadyNotified));
  }
}
