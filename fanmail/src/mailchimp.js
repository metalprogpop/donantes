// Minimal Mailchimp Marketing API client: only what the fanmail needs.
export function createMailchimp(apiKey) {
  const dc = apiKey.split('-').pop();
  const base = `https://${dc}.api.mailchimp.com/3.0`;
  const auth = `Basic ${Buffer.from(`fanmail:${apiKey}`).toString('base64')}`;

  async function request(method, path, body) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 204) return null;
    const data = await res.json();
    if (!res.ok) throw new Error(`Mailchimp ${method} ${path}: ${res.status} ${data.title ?? ''} ${data.detail ?? ''}`.trim());
    return data;
  }

  return {
    editUrl: (webId) => `https://${dc}.admin.mailchimp.com/campaigns/edit?id=${webId}`,

    async campaigns({ status, count = 100 }) {
      const q = new URLSearchParams({ status, count: String(count), sort_field: 'create_time', sort_dir: 'DESC' });
      const data = await request('GET', `/campaigns?${q}`);
      return data.campaigns;
    },

    async contentHtml(campaignId) {
      return (await request('GET', `/campaigns/${campaignId}/content`)).html ?? '';
    },

    async upsertTemplate(name, html) {
      const q = new URLSearchParams({ type: 'user', count: '1000', fields: 'templates.id,templates.name' });
      const existing = (await request('GET', `/templates?${q}`)).templates.find((t) => t.name === name);
      if (existing) return (await request('PATCH', `/templates/${existing.id}`, { name, html })).id;
      return (await request('POST', '/templates', { name, html })).id;
    },

    async createCampaign({ listId, settings }) {
      return request('POST', '/campaigns', { type: 'regular', recipients: { list_id: listId }, settings });
    },

    async updateCampaignSettings(campaignId, settings) {
      return request('PATCH', `/campaigns/${campaignId}`, { settings });
    },

    async setTemplateContent(campaignId, templateId, sections) {
      return request('PUT', `/campaigns/${campaignId}/content`, { template: { id: templateId, sections } });
    },
  };
}
