/**
 * Dynamic Weather Overlay System for Magic Survival
 * Simulates atmospheric effects that transition based on wave progression:
 * - Waves 1-4: Cosmic Stardust & Void Mist
 * - Waves 5-8: Glacial Blizzard & Falling Snowflakes
 * - Waves 9-13: Hellfire Inferno & Rising Magma Embers
 * - Waves 14-17: Abyssal Blood Rain & Lightning Flashes
 * - Waves 18-20: Cataclysmic Void Ash & Falling Meteor Streaks
 */

export type WeatherType = 'stardust' | 'snow' | 'embers' | 'blood_rain' | 'cataclysm';

export interface WeatherParticle {
  x: number;
  y: number;
  z: number; // depth
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  spin?: number;
  spinSpeed?: number;
  length?: number;
}

export interface GroundSplash {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  life: number;
}

export class WeatherSystem {
  public currentWeather: WeatherType = 'snow'; // Default matching wave 8
  private targetWeather: WeatherType = 'snow';
  private transitionTimer: number = 0;
  private transitionDuration: number = 2.5;

  private particles: WeatherParticle[] = [];
  private splashes: GroundSplash[] = [];
  private maxParticles: number = 280;

  // Sky flash for thunderstorms
  public skyFlashAlpha: number = 0;

  constructor() {
    this.initParticles();
  }

  private initParticles() {
    this.particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push(this.createParticle(true));
    }
  }

  public setWeatherForWave(wave: number): string | null {
    let nextWeather: WeatherType = 'stardust';
    let title: string | null = null;

    if (wave >= 18) {
      nextWeather = 'cataclysm';
      title = 'Cataclysmic Void Fall';
    } else if (wave >= 14) {
      nextWeather = 'blood_rain';
      title = 'Abyssal Blood Tempest';
    } else if (wave >= 9) {
      nextWeather = 'embers';
      title = 'Hellfire Embers Ignite';
    } else if (wave >= 5) {
      nextWeather = 'snow';
      title = 'Glacial Frost Descends';
    } else {
      nextWeather = 'stardust';
      title = 'Cosmic Stardust & Void Mist';
    }

    if (nextWeather !== this.targetWeather) {
      this.targetWeather = nextWeather;
      this.transitionTimer = this.transitionDuration;
      return title;
    }
    return null;
  }

  public forceWeather(type: WeatherType) {
    this.currentWeather = type;
    this.targetWeather = type;
    this.initParticles();
  }

  private createParticle(randomSpread: boolean = false): WeatherParticle {
    const w = typeof window !== 'undefined' ? window.innerWidth * 1.6 : 1920;
    const h = typeof window !== 'undefined' ? window.innerHeight * 1.6 : 1080;

    let x = (Math.random() - 0.5) * w;
    let y = randomSpread ? (Math.random() - 0.5) * h : -h / 2 - 50;

    const weather = this.currentWeather;

    if (weather === 'snow') {
      // Glacial Snowflakes
      return {
        x,
        y,
        z: Math.random() * 0.8 + 0.5,
        vx: (Math.random() - 0.3) * 60 + 20, // Wind blowing slightly right
        vy: Math.random() * 80 + 70,
        size: Math.random() * 4 + 2,
        color: Math.random() < 0.4 ? '#e0f2fe' : '#ffffff',
        alpha: Math.random() * 0.6 + 0.35,
        life: Math.random() * 5 + 4,
        maxLife: 8,
        spin: Math.random() * Math.PI * 2,
        spinSpeed: (Math.random() - 0.5) * 2,
      };
    } else if (weather === 'embers') {
      // Rising Hellfire Embers from ground
      y = randomSpread ? (Math.random() - 0.5) * h : h / 2 + 50;
      return {
        x,
        y,
        z: Math.random() * 0.8 + 0.5,
        vx: (Math.random() - 0.5) * 45,
        vy: -(Math.random() * 90 + 50), // Float upwards
        size: Math.random() * 4 + 2,
        color: Math.random() < 0.6 ? '#f97316' : '#ef4444',
        alpha: Math.random() * 0.7 + 0.3,
        life: Math.random() * 4 + 3,
        maxLife: 6,
      };
    } else if (weather === 'blood_rain') {
      // Slanted Abyssal Rain
      return {
        x,
        y,
        z: Math.random() * 0.8 + 0.6,
        vx: 120, // Angled storm wind
        vy: Math.random() * 400 + 450, // Fast falling rain
        size: 2,
        length: Math.random() * 18 + 12,
        color: Math.random() < 0.3 ? '#f43f5e' : '#991b1b',
        alpha: Math.random() * 0.5 + 0.4,
        life: Math.random() * 2 + 1,
        maxLife: 3,
      };
    } else if (weather === 'cataclysm') {
      // Void Ash & Burning Meteor Streaks
      const isMeteor = Math.random() < 0.15;
      return {
        x,
        y,
        z: isMeteor ? 1.4 : Math.random() * 0.8 + 0.5,
        vx: isMeteor ? 300 : (Math.random() - 0.5) * 70,
        vy: isMeteor ? 550 : Math.random() * 120 + 80,
        size: isMeteor ? Math.random() * 7 + 4 : Math.random() * 3 + 2,
        length: isMeteor ? Math.random() * 35 + 25 : undefined,
        color: isMeteor ? '#fbbf24' : Math.random() < 0.5 ? '#f97316' : '#64748b',
        alpha: isMeteor ? 0.95 : Math.random() * 0.5 + 0.25,
        life: Math.random() * 3 + 2,
        maxLife: 4,
      };
    } else {
      // Stardust & Cosmic Mist
      return {
        x,
        y: randomSpread ? (Math.random() - 0.5) * h : (Math.random() - 0.5) * h,
        z: Math.random() * 0.7 + 0.5,
        vx: (Math.random() - 0.5) * 25,
        vy: (Math.random() - 0.5) * 25,
        size: Math.random() * 3.5 + 1.5,
        color: Math.random() < 0.5 ? '#38bdf8' : '#a855f7',
        alpha: Math.random() * 0.6 + 0.2,
        life: Math.random() * 5 + 3,
        maxLife: 6,
      };
    }
  }

  public shift(dx: number, dy: number) { for (const p of this.particles) { p.x -= dx; p.y -= dy; } }
  public update(dt: number, cameraX: number, cameraY: number) {
    // Weather transition interpolation
    if (this.transitionTimer > 0) {
      this.transitionTimer -= dt;
      if (this.transitionTimer <= 0) {
        this.currentWeather = this.targetWeather;
      }
    }

    // Sky lightning decay
    if (this.skyFlashAlpha > 0) {
      this.skyFlashAlpha = Math.max(0, this.skyFlashAlpha - dt * 3);
    } else if (this.currentWeather === 'blood_rain' || this.currentWeather === 'cataclysm') {
      // Random lightning flash
      if (Math.random() < 0.008) {
        this.skyFlashAlpha = Math.random() * 0.35 + 0.15;
      }
    }

    const boundW = 1600;
    const boundH = 1200;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life -= dt;

      // Particle physics with subtle turbulence
      if (this.currentWeather === 'snow') {
        p.x += (p.vx + Math.sin(p.life * 2) * 20) * dt;
        p.y += p.vy * dt;
        if (p.spin !== undefined && p.spinSpeed !== undefined) {
          p.spin += p.spinSpeed * dt;
        }
      } else if (this.currentWeather === 'embers') {
        p.x += (p.vx + Math.sin(p.life * 3) * 25) * dt;
        p.y += p.vy * dt;
      } else if (this.currentWeather === 'blood_rain') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Ground splash when reaching arena floor height
        if (p.y > (Math.random() - 0.5) * 700 && Math.random() < 0.06) {
          this.splashes.push({
            x: p.x,
            y: p.y,
            radius: 1,
            maxRadius: Math.random() * 7 + 4,
            color: p.color,
            alpha: 0.6,
            life: 0.2,
          });
        }
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }

      // Re-cycle particle
      if (
        p.life <= 0 ||
        p.y > cameraY + boundH / 2 + 100 ||
        p.y < cameraY - boundH / 2 - 100 ||
        p.x > cameraX + boundW / 2 + 100 ||
        p.x < cameraX - boundW / 2 - 100
      ) {
        this.particles[i] = this.createParticle(false);
      }
    }

    // Update ground splashes
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i];
      s.life -= dt;
      s.radius += (s.maxRadius - s.radius) * 12 * dt;
      s.alpha = Math.max(0, s.life / 0.2);
      if (s.life <= 0) {
        this.splashes.splice(i, 1);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // 1. Sky Lightning Flash Overlay
    if (this.skyFlashAlpha > 0) {
      ctx.fillStyle = `rgba(224, 231, 255, ${this.skyFlashAlpha})`;
      ctx.fillRect(-2000, -2000, 4000, 4000);
    }

    // 2. Ground Splashes (drawn beneath falling particles)
    ctx.strokeStyle = '#ef4444';
    for (const s of this.splashes) {
      ctx.save();
      ctx.globalAlpha = s.alpha * 0.7;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.radius * 1.5, s.radius * 0.7, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Falling Weather Particles with Additive Glow
    ctx.globalCompositeOperation = 'screen';

    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.length !== undefined) {
        // Rain streak or meteor trail
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - (p.vx / p.vy) * p.length, p.y - p.length);
        ctx.stroke();
      } else if (p.spin !== undefined) {
        // Snowflake crystal with rotation
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin);
        ctx.beginPath();
        ctx.arc(0, 0, p.size * p.z, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Ember or stardust orb
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.z, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    ctx.restore();
  }
}
