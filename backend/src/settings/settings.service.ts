import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationSetting } from '../database/entities/application-setting.entity';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(
    @InjectRepository(ApplicationSetting)
    private readonly settingRepo: Repository<ApplicationSetting>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async onModuleInit() {
    await this.initDefaults();
  }

  async initDefaults() {
    const defaults = [
      { key: 'restaurant_name', value: 'Royal Feast Palace', category: 'branding', description: 'Restaurant brand name' },
      { key: 'restaurant_tagline', value: 'Delicious Food, Royal Experience', category: 'branding', description: 'Tagline' },
      { key: 'primary_color', value: '#d97706', category: 'branding', description: 'Brand amber/saffron primary' },
      { key: 'secondary_color', value: '#0f172a', category: 'branding', description: 'Dark slate charcoal secondary' },
      { key: 'currency_symbol', value: '₹', category: 'restaurant', description: 'Currency symbol' },
      { key: 'gst_number', value: '36ABCDE1234F1Z5', category: 'restaurant', description: 'Restaurant GST Number' },
      { key: 'contact_number', value: '+91 9876543210', category: 'restaurant', description: 'Contact Phone' },
      { key: 'address', value: '123 Royal Grand Road, Hyderabad, Telangana', category: 'restaurant', description: 'Address' },
      { key: 'tax_percentage', value: '5.0', category: 'tax', description: 'Standard tax %' },
      { key: 'bill_footer_text', value: 'Thank you for dining with us! Please visit again.', category: 'restaurant', description: 'Invoice footer' },
    ];

    for (const item of defaults) {
      const exists = await this.settingRepo.findOne({ where: { key: item.key } });
      if (!exists) {
        await this.settingRepo.save(this.settingRepo.create(item));
      }
    }
  }

  async getAll(): Promise<Record<string, string>> {
    const list = await this.settingRepo.find();
    const map: Record<string, string> = {};
    for (const item of list) {
      map[item.key] = item.value;
    }
    return map;
  }

  async getPublicSettings(): Promise<Record<string, string>> {
    return this.getAll();
  }

  async updateSettings(settings: Record<string, string>): Promise<Record<string, string>> {
    for (const [key, value] of Object.entries(settings)) {
      let existing = await this.settingRepo.findOne({ where: { key } });
      if (existing) {
        existing.value = value;
        await this.settingRepo.save(existing);
      } else {
        await this.settingRepo.save(this.settingRepo.create({ key, value, category: 'custom' }));
      }
    }
    const updated = await this.getAll();
    this.eventsGateway.notifySettingsUpdated(updated);
    return updated;
  }
}
