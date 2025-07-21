// EmailBot Pro - 24/7 Email Marketing Automation System

class EmailBotApp {
    constructor() {
        this.db = null;
        this.automationInterval = null;
        this.isAutomationRunning = false;
        this.isPaused = false;
        this.settings = {
            dailySendLimit: 500,
            sendIntervalSeconds: 30,
            workingHoursStart: 9,
            workingHoursEnd: 17,
            workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            signature: 'Best regards,\nYour Marketing Team',
            unsubscribeLink: true,
            trackOpens: true,
            aiProvider: 'huggingface',
            corsProxy: 'https://cors-anywhere.herokuapp.com/'
        };
        this.stats = {
            totalLeads: 0,
            emailsSent: 0,
            successRate: 0,
            activeCampaigns: 0,
            sentToday: 0
        };
        this.sampleData = {
            leads: [
                {
                    id: 1,
                    name: "John Smith",
                    email: "john@techstartup.com",
                    company: "TechStartup Inc",
                    location: "San Francisco, CA",
                    industry: "Technology",
                    title: "CEO",
                    phone: "+1-555-0101",
                    website: "techstartup.com",
                    status: "active",
                    source: "google_maps",
                    tags: ["startup", "b2b"],
                    created: "2025-07-21",
                    notes: "Interested in AI solutions"
                },
                {
                    id: 2,
                    name: "Sarah Johnson",
                    email: "sarah@designstudio.com",
                    company: "Creative Design Studio",
                    location: "New York, NY",
                    industry: "Design",
                    title: "Creative Director",
                    phone: "+1-555-0102",
                    website: "designstudio.com",
                    status: "active",
                    source: "linkedin",
                    tags: ["agency", "creative"],
                    created: "2025-07-21",
                    notes: "Looking for marketing automation"
                },
                {
                    id: 3,
                    name: "Michael Chen",
                    email: "michael@fintech.co",
                    company: "FinTech Solutions",
                    location: "Austin, TX",
                    industry: "Finance",
                    title: "CTO",
                    phone: "+1-555-0103",
                    website: "fintech.co",
                    status: "active",
                    source: "scraping",
                    tags: ["fintech", "b2b"],
                    created: "2025-07-21",
                    notes: "Tech-savvy, interested in automation"
                }
            ],
            templates: [
                {
                    id: 1,
                    name: "Cold Outreach - B2B",
                    subject: "Quick question about {company}'s growth plans",
                    body: "Hi {name},\n\nI came across {company} and was impressed by your work in {location}.\n\nI help companies like yours streamline their email marketing processes and typically see 3x better conversion rates.\n\nWould you be open to a 15-minute chat this week to see if there's a fit?\n\nBest regards,\n[Your Name]",
                    tags: ["cold", "b2b"],
                    tone: "professional"
                },
                {
                    id: 2,
                    name: "Follow-up Sequence",
                    subject: "Following up on {company}",
                    body: "Hi {name},\n\nI wanted to follow up on my previous email about helping {company} with marketing automation.\n\nI understand you're busy, but I believe we could help {company} save significant time and increase conversions.\n\nWould next Tuesday or Wednesday work for a brief call?\n\nThanks,\n[Your Name]",
                    tags: ["followup"],
                    tone: "friendly"
                }
            ]
        };
        
        this.init();
    }

    async init() {
        await this.initDatabase();
        this.initUI();
        this.loadSettings();
        await this.loadSampleDataIfEmpty();
        this.updateStats();
        this.startPeriodicUpdates();
        this.logActivity('System initialized successfully', 'success');
    }

    // Database Management
    async initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('EmailBotDB', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores
                if (!db.objectStoreNames.contains('leads')) {
                    const leadStore = db.createObjectStore('leads', { keyPath: 'id', autoIncrement: true });
                    leadStore.createIndex('email', 'email', { unique: true });
                    leadStore.createIndex('status', 'status', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('templates')) {
                    db.createObjectStore('templates', { keyPath: 'id', autoIncrement: true });
                }
                
                if (!db.objectStoreNames.contains('campaigns')) {
                    db.createObjectStore('campaigns', { keyPath: 'id', autoIncrement: true });
                }
                
                if (!db.objectStoreNames.contains('emails')) {
                    const emailStore = db.createObjectStore('emails', { keyPath: 'id', autoIncrement: true });
                    emailStore.createIndex('leadId', 'leadId', { unique: false });
                    emailStore.createIndex('campaignId', 'campaignId', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('logs')) {
                    const logStore = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
                    logStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    async saveToStore(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getFromStore(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllFromStore(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // UI Management
    initUI() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.showSection(section);
            });
        });

        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                const sidebar = document.getElementById('sidebar');
                sidebar.classList.toggle('collapsed');
            });
        }

        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Automation controls
        const startBtn = document.getElementById('startAutomation');
        const pauseBtn = document.getElementById('pauseAutomation');
        const stopBtn = document.getElementById('stopAutomation');
        
        if (startBtn) startBtn.addEventListener('click', () => this.startAutomation());
        if (pauseBtn) pauseBtn.addEventListener('click', () => this.pauseAutomation());
        if (stopBtn) stopBtn.addEventListener('click', () => this.stopAutomation());

        // Lead Scraper
        const scraperForm = document.getElementById('scraperForm');
        if (scraperForm) {
            scraperForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.startScraping();
            });
        }
        
        const loadSampleBtn = document.getElementById('loadSampleLeads');
        if (loadSampleBtn) loadSampleBtn.addEventListener('click', () => this.loadSampleLeads());
        
        const exportLeadsBtn = document.getElementById('exportLeads');
        if (exportLeadsBtn) exportLeadsBtn.addEventListener('click', () => this.exportLeads());
        
        const clearLeadsBtn = document.getElementById('clearLeads');
        if (clearLeadsBtn) clearLeadsBtn.addEventListener('click', () => this.clearAllLeads());

        // Email Writer
        const templateSelect = document.getElementById('emailTemplate');
        if (templateSelect) {
            templateSelect.addEventListener('change', (e) => this.loadEmailTemplate(e.target.value));
        }
        
        const generateBtn = document.getElementById('generateEmail');
        if (generateBtn) generateBtn.addEventListener('click', () => this.generateEmailWithAI());
        
        const saveTemplateBtn = document.getElementById('saveTemplate');
        if (saveTemplateBtn) saveTemplateBtn.addEventListener('click', () => this.saveEmailTemplate());
        
        const previewBtn = document.getElementById('previewEmail');
        if (previewBtn) previewBtn.addEventListener('click', () => this.updateEmailPreview());
        
        const generateSubjectBtn = document.querySelector('.generate-subject');
        if (generateSubjectBtn) {
            generateSubjectBtn.addEventListener('click', () => this.generateSubjectWithAI());
        }

        // Merge tag insertion
        document.querySelectorAll('.merge-tag-item').forEach(item => {
            item.addEventListener('click', () => {
                const tag = item.dataset.tag;
                this.insertMergeTag(tag);
            });
        });

        // Campaign management
        const createCampaignBtn = document.getElementById('createCampaignBtn');
        if (createCampaignBtn) {
            createCampaignBtn.addEventListener('click', () => this.showModal('campaignModal'));
        }
        
        const campaignForm = document.getElementById('campaignForm');
        if (campaignForm) {
            campaignForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createCampaign();
            });
        }

        // Settings
        const saveSettingsBtn = document.getElementById('saveSettings');
        if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        
        const clearDataBtn = document.getElementById('clearAllData');
        if (clearDataBtn) clearDataBtn.addEventListener('click', () => this.clearAllData());
        
        const resetSettingsBtn = document.getElementById('resetSettings');
        if (resetSettingsBtn) resetSettingsBtn.addEventListener('click', () => this.resetSettings());

        // Import/Export
        const importLeadsBtn = document.getElementById('importLeadsBtn');
        if (importLeadsBtn) importLeadsBtn.addEventListener('click', () => this.importLeads());
        
        const exportLeadsBtn2 = document.getElementById('exportLeadsBtn');
        if (exportLeadsBtn2) exportLeadsBtn2.addEventListener('click', () => this.exportLeads());
        
        const createBackupBtn = document.getElementById('createBackupBtn');
        if (createBackupBtn) createBackupBtn.addEventListener('click', () => this.createBackup());
        
        const restoreBackupBtn = document.getElementById('restoreBackupBtn');
        if (restoreBackupBtn) restoreBackupBtn.addEventListener('click', () => this.restoreBackup());

        // Real-time preview updates
        const emailSubject = document.getElementById('emailSubject');
        const emailBody = document.getElementById('emailBody');
        
        if (emailSubject) emailSubject.addEventListener('input', () => this.updateEmailPreview());
        if (emailBody) emailBody.addEventListener('input', () => this.updateEmailPreview());

        // Modal close functionality
        document.querySelectorAll('.modal-close').forEach(button => {
            button.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) this.closeModal(modal.id);
            });
        });

        // Quick Actions in Dashboard
        this.setupQuickActions();

        // Initialize first section
        this.showSection('dashboard');
    }

    setupQuickActions() {
        // Find New Leads button
        const findLeadsBtn = document.querySelector('.quick-actions .btn--primary');
        if (findLeadsBtn) {
            findLeadsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection('scraper');
            });
        }

        // Write Email button
        const writeEmailBtn = document.querySelector('.quick-actions .btn--secondary');
        if (writeEmailBtn) {
            writeEmailBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection('writer');
            });
        }

        // Create Campaign button
        const createCampaignBtn = document.querySelector('.quick-actions .btn--outline');
        if (createCampaignBtn) {
            createCampaignBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection('campaigns');
            });
        }
    }

    showSection(sectionName) {
        console.log('Showing section:', sectionName);
        
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeNavItem = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }

        // Update content
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        const activeSection = document.getElementById(`${sectionName}-section`);
        if (activeSection) {
            activeSection.classList.add('active');
        }

        // Update page title and breadcrumb
        const titles = {
            dashboard: 'Dashboard',
            scraper: 'Lead Scraper',
            writer: 'AI Email Writer',
            campaigns: 'Campaigns',
            sender: 'Email Sender',
            analytics: 'Analytics',
            settings: 'Settings',
            'import-export': 'Import/Export'
        };
        
        const pageTitle = document.getElementById('pageTitle');
        const breadcrumb = document.getElementById('breadcrumb');
        
        if (pageTitle) pageTitle.textContent = titles[sectionName] || sectionName;
        if (breadcrumb) breadcrumb.textContent = `Home / ${titles[sectionName] || sectionName}`;

        // Load section-specific data
        this.loadSectionData(sectionName);
    }

    async loadSectionData(sectionName) {
        switch (sectionName) {
            case 'scraper':
                await this.loadLeadsTable();
                break;
            case 'writer':
                await this.loadEmailTemplates();
                this.updateEmailPreview();
                break;
            case 'campaigns':
                await this.loadCampaigns();
                break;
            case 'analytics':
                await this.loadAnalytics();
                break;
        }
    }

    // Lead Scraping
    async startScraping() {
        const keywords = document.getElementById('scraperKeywords')?.value || '';
        const location = document.getElementById('scraperLocation')?.value || '';
        const contactType = document.getElementById('scraperContactType')?.value || 'ceo';
        const companySize = document.getElementById('scraperCompanySize')?.value || 'startup';

        if (!keywords || !location) {
            this.showToast('Please fill in keywords and location', 'error');
            return;
        }

        this.showLoading();
        this.logActivity(`Starting lead scraping for "${keywords}" in ${location}`, 'info');

        // Simulate scraping process
        setTimeout(async () => {
            const newLeads = this.generateSimulatedLeads(keywords, location, contactType, companySize);
            
            for (const lead of newLeads) {
                try {
                    await this.saveToStore('leads', lead);
                } catch (error) {
                    console.log('Lead already exists:', lead.email);
                }
            }

            await this.loadLeadsTable();
            this.updateStats();
            this.hideLoading();
            this.showToast(`Found ${newLeads.length} new leads!`, 'success');
            this.logActivity(`Scraping completed: ${newLeads.length} leads found`, 'success');
        }, 3000);
    }

    generateSimulatedLeads(keywords, location, contactType, companySize) {
        const leads = [];
        const names = ['Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson', 'Eva Brown', 'Frank Miller'];
        const companies = ['TechCorp', 'InnovateLab', 'FutureWorks', 'SmartSolutions', 'NextGen Systems', 'ProActive Inc'];
        const domains = ['gmail.com', 'company.com', 'business.org', 'enterprise.net', 'startup.io'];
        
        const count = Math.floor(Math.random() * 8) + 3; // 3-10 leads
        
        for (let i = 0; i < count; i++) {
            const name = names[Math.floor(Math.random() * names.length)];
            const company = companies[Math.floor(Math.random() * companies.length)];
            const domain = domains[Math.floor(Math.random() * domains.length)];
            const email = `${name.toLowerCase().replace(' ', '.')}@${domain}`;
            
            leads.push({
                name,
                email,
                company: `${company} ${keywords}`,
                location,
                industry: keywords,
                title: this.getJobTitle(contactType),
                phone: `+1-555-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
                website: `${company.toLowerCase()}.com`,
                status: 'active',
                source: 'scraping',
                tags: [keywords.toLowerCase(), companySize],
                created: new Date().toISOString().split('T')[0],
                notes: `Scraped lead from ${location}`
            });
        }
        
        return leads;
    }

    getJobTitle(contactType) {
        const titles = {
            ceo: ['CEO', 'Founder', 'Co-founder', 'President'],
            marketing: ['Marketing Director', 'CMO', 'Marketing Manager', 'VP Marketing'],
            sales: ['Sales Manager', 'VP Sales', 'Sales Director', 'Business Development'],
            hr: ['HR Director', 'CHRO', 'HR Manager', 'People Operations'],
            cto: ['CTO', 'Tech Lead', 'VP Engineering', 'Technical Director']
        };
        
        const titleArray = titles[contactType] || titles.ceo;
        return titleArray[Math.floor(Math.random() * titleArray.length)];
    }

    async loadSampleLeads() {
        this.showLoading();
        
        for (const lead of this.sampleData.leads) {
            try {
                await this.saveToStore('leads', lead);
            } catch (error) {
                console.log('Sample lead already exists:', lead.email);
            }
        }
        
        await this.loadLeadsTable();
        this.updateStats();
        this.hideLoading();
        this.showToast('Sample leads loaded successfully!', 'success');
        this.logActivity('Sample leads loaded', 'info');
    }

    async loadLeadsTable() {
        const leads = await this.getAllFromStore('leads');
        const tbody = document.getElementById('leadsTableBody');
        
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (leads.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--color-text-secondary);">No leads found. Use the scraper or load sample data to get started.</td></tr>';
            return;
        }
        
        leads.forEach(lead => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="checkbox" class="lead-checkbox" data-id="${lead.id}"></td>
                <td>${lead.name}</td>
                <td>${lead.company}</td>
                <td>${lead.email}</td>
                <td>${lead.location}</td>
                <td><span class="status status--${lead.status === 'active' ? 'success' : 'warning'}">${lead.status}</span></td>
                <td>
                    <button class="btn btn--sm btn--outline" onclick="window.app.editLead(${lead.id})">Edit</button>
                    <button class="btn btn--sm btn--outline" onclick="window.app.deleteLead(${lead.id})">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Update select all checkbox
        const selectAllCheckbox = document.getElementById('selectAllLeads');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                document.querySelectorAll('.lead-checkbox').forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                });
            });
        }
    }

    // AI Email Writing
    async loadEmailTemplates() {
        const templates = await this.getAllFromStore('templates');
        const select = document.getElementById('emailTemplate');
        
        if (!select) return;
        
        // Clear existing options except first one
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }
        
        // Add sample templates if none exist
        if (templates.length === 0) {
            for (const template of this.sampleData.templates) {
                await this.saveToStore('templates', template);
            }
            return this.loadEmailTemplates();
        }
        
        templates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = template.name;
            select.appendChild(option);
        });
    }

    async loadEmailTemplate(templateId) {
        const subjectField = document.getElementById('emailSubject');
        const bodyField = document.getElementById('emailBody');
        const toneField = document.getElementById('emailTone');
        
        if (!templateId) {
            if (subjectField) subjectField.value = '';
            if (bodyField) bodyField.value = '';
            this.updateEmailPreview();
            return;
        }
        
        const template = await this.getFromStore('templates', parseInt(templateId));
        if (template) {
            if (subjectField) subjectField.value = template.subject;
            if (bodyField) bodyField.value = template.body;
            if (toneField) toneField.value = template.tone;
            this.updateEmailPreview();
        }
    }

    async generateEmailWithAI() {
        const toneField = document.getElementById('emailTone');
        const keywordsField = document.getElementById('scraperKeywords');
        
        const tone = toneField?.value || 'professional';
        const keywords = keywordsField?.value || 'business automation';
        
        this.showLoading();
        
        // Simulate AI generation
        setTimeout(() => {
            const templates = this.getAIGeneratedEmail(tone, keywords);
            
            const subjectField = document.getElementById('emailSubject');
            const bodyField = document.getElementById('emailBody');
            
            if (subjectField) subjectField.value = templates.subject;
            if (bodyField) bodyField.value = templates.body;
            
            this.updateEmailPreview();
            this.hideLoading();
            this.showToast('Email generated with AI!', 'success');
            this.logActivity('AI email generated', 'info');
        }, 2000);
    }

    getAIGeneratedEmail(tone, keywords) {
        const templates = {
            professional: {
                subject: `Streamline {company}'s ${keywords} processes - 15 min chat?`,
                body: `Dear {name},\n\nI hope this email finds you well. I noticed {company}'s impressive work in the ${keywords} space in {location}.\n\nI specialize in helping companies like {company} optimize their processes and typically see 40-60% efficiency improvements.\n\nWould you be available for a brief 15-minute conversation this week to explore potential synergies?\n\nBest regards,\n[Your Name]`
            },
            friendly: {
                subject: `Quick question about {company}'s ${keywords} goals`,
                body: `Hi {name}!\n\nI came across {company} and was really impressed by what you're doing in {location}.\n\nI help businesses streamline their ${keywords} workflows, and I'd love to share some insights that might be valuable for {company}.\n\nWould you be up for a quick chat sometime this week?\n\nCheers,\n[Your Name]`
            },
            casual: {
                subject: `{name}, saw {company}'s work - impressed! 💪`,
                body: `Hey {name},\n\nJust checked out {company} - really cool stuff you're doing in {location}!\n\nI work with companies in the ${keywords} space and have some ideas that might help {company} scale even faster.\n\nWant to grab a quick call this week?\n\nTalk soon,\n[Your Name]`
            },
            sales: {
                subject: `{company} could save $10,000+ on ${keywords} costs`,
                body: `Hi {name},\n\nI've been researching companies in {location} and {company} caught my attention.\n\nI help businesses reduce ${keywords} costs by 30-50% while improving efficiency. Most clients see ROI within 60 days.\n\nWould you be interested in a 10-minute call to see how this could work for {company}?\n\nBest,\n[Your Name]`
            }
        };
        
        return templates[tone] || templates.professional;
    }

    async generateSubjectWithAI() {
        const bodyField = document.getElementById('emailBody');
        const toneField = document.getElementById('emailTone');
        
        const body = bodyField?.value || '';
        const tone = toneField?.value || 'professional';
        
        if (!body) {
            this.showToast('Please write email body first', 'warning');
            return;
        }
        
        this.showLoading();
        
        setTimeout(() => {
            const subjects = this.getAIGeneratedSubjects(tone);
            const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
            
            const subjectField = document.getElementById('emailSubject');
            if (subjectField) subjectField.value = randomSubject;
            
            this.updateEmailPreview();
            this.hideLoading();
            this.showToast('Subject line generated!', 'success');
        }, 1000);
    }

    getAIGeneratedSubjects(tone) {
        const subjects = {
            professional: [
                'Partnership opportunity with {company}',
                'Streamlining {company}\'s operations - brief discussion?',
                'Industry insights for {company}',
                'Optimization strategies for {company}'
            ],
            friendly: [
                'Quick question about {company}',
                'Loved what I saw at {company}!',
                'Coffee chat about {company}\'s growth?',
                'Exciting opportunity for {name}'
            ],
            casual: [
                '{name}, this might interest you 🚀',
                'Cool stuff happening at {company}!',
                'Quick idea for {company}',
                'Hey {name}, got a sec?'
            ],
            sales: [
                '{company} - Save 30% on operations costs',
                'ROI opportunity for {company}',
                '{name}, this could boost {company}\'s revenue',
                'Cost reduction strategy for {company}'
            ]
        };
        
        return subjects[tone] || subjects.professional;
    }

    updateEmailPreview() {
        const subjectField = document.getElementById('emailSubject');
        const bodyField = document.getElementById('emailBody');
        const previewSubject = document.getElementById('previewSubject');
        const previewBody = document.getElementById('previewBody');
        
        if (!previewSubject || !previewBody) return;
        
        const subject = subjectField?.value || 'Your email subject';
        const body = bodyField?.value || 'Your email content will appear here...';
        
        // Sample lead for preview
        const sampleLead = {
            name: 'John Smith',
            company: 'TechStartup Inc',
            location: 'San Francisco, CA',
            industry: 'Technology',
            title: 'CEO'
        };
        
        const processedSubject = this.replaceMergeTags(subject, sampleLead);
        const processedBody = this.replaceMergeTags(body, sampleLead);
        
        previewSubject.textContent = `Subject: ${processedSubject}`;
        previewBody.textContent = processedBody;
    }

    replaceMergeTags(text, lead) {
        return text
            .replace(/\{name\}/g, lead.name)
            .replace(/\{company\}/g, lead.company)
            .replace(/\{location\}/g, lead.location)
            .replace(/\{industry\}/g, lead.industry)
            .replace(/\{title\}/g, lead.title);
    }

    insertMergeTag(tag) {
        const bodyTextarea = document.getElementById('emailBody');
        if (!bodyTextarea) return;
        
        const start = bodyTextarea.selectionStart;
        const end = bodyTextarea.selectionEnd;
        const text = bodyTextarea.value;
        
        bodyTextarea.value = text.substring(0, start) + tag + text.substring(end);
        bodyTextarea.focus();
        bodyTextarea.setSelectionRange(start + tag.length, start + tag.length);
        this.updateEmailPreview();
    }

    async saveEmailTemplate() {
        const name = prompt('Template name:');
        if (!name) return;
        
        const subjectField = document.getElementById('emailSubject');
        const bodyField = document.getElementById('emailBody');
        const toneField = document.getElementById('emailTone');
        
        const template = {
            name,
            subject: subjectField?.value || '',
            body: bodyField?.value || '',
            tone: toneField?.value || 'professional',
            tags: ['custom'],
            created: new Date().toISOString()
        };
        
        await this.saveToStore('templates', template);
        await this.loadEmailTemplates();
        this.showToast('Template saved successfully!', 'success');
        this.logActivity(`Email template "${name}" saved`, 'info');
    }

    // Campaign Management
    async loadCampaigns() {
        const campaigns = await this.getAllFromStore('campaigns');
        const container = document.getElementById('campaignsGrid');
        
        if (!container) return;
        
        container.innerHTML = '';
        
        if (campaigns.length === 0) {
            container.innerHTML = '<p>No campaigns created yet. Click "Create Campaign" to get started.</p>';
            return;
        }
        
        campaigns.forEach(campaign => {
            const card = document.createElement('div');
            card.className = 'campaign-card';
            card.innerHTML = `
                <div class="campaign-header">
                    <div class="campaign-name">${campaign.name}</div>
                    <div class="campaign-status ${campaign.status}">${campaign.status}</div>
                </div>
                <div class="campaign-stats">
                    <div class="campaign-stat">
                        <span class="campaign-stat-value">${campaign.leadsCount || 0}</span>
                        <span class="campaign-stat-label">Leads</span>
                    </div>
                    <div class="campaign-stat">
                        <span class="campaign-stat-value">${campaign.sentCount || 0}</span>
                        <span class="campaign-stat-label">Sent</span>
                    </div>
                    <div class="campaign-stat">
                        <span class="campaign-stat-value">${campaign.openedCount || 0}</span>
                        <span class="campaign-stat-label">Opened</span>
                    </div>
                    <div class="campaign-stat">
                        <span class="campaign-stat-value">${campaign.clickedCount || 0}</span>
                        <span class="campaign-stat-label">Clicked</span>
                    </div>
                </div>
                <div class="campaign-actions">
                    <button class="btn btn--sm btn--primary" onclick="window.app.startCampaign(${campaign.id})">Start</button>
                    <button class="btn btn--sm btn--secondary" onclick="window.app.pauseCampaign(${campaign.id})">Pause</button>
                    <button class="btn btn--sm btn--outline" onclick="window.app.deleteCampaign(${campaign.id})">Delete</button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    async createCampaign() {
        const nameField = document.getElementById('campaignName');
        const templateField = document.getElementById('campaignTemplate');
        const leadsField = document.getElementById('campaignLeads');
        
        const name = nameField?.value || '';
        const templateId = templateField?.value || '';
        const leadsFilter = leadsField?.value || 'all';
        
        if (!name || !templateId) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }
        
        const leads = await this.getAllFromStore('leads');
        const filteredLeads = this.filterLeadsForCampaign(leads, leadsFilter);
        
        const campaign = {
            name,
            templateId: parseInt(templateId),
            leadsFilter,
            leadsCount: filteredLeads.length,
            sentCount: 0,
            openedCount: 0,
            clickedCount: 0,
            status: 'draft',
            created: new Date().toISOString(),
            settings: {
                sendInterval: this.settings.sendIntervalSeconds,
                dailyLimit: this.settings.dailySendLimit
            }
        };
        
        await this.saveToStore('campaigns', campaign);
        this.closeModal('campaignModal');
        await this.loadCampaigns();
        this.updateStats();
        this.showToast(`Campaign "${name}" created with ${filteredLeads.length} leads!`, 'success');
        this.logActivity(`Campaign "${name}" created`, 'info');
    }

    filterLeadsForCampaign(leads, filter) {
        switch (filter) {
            case 'active':
                return leads.filter(lead => lead.status === 'active');
            case 'untargeted':
                return leads.filter(lead => !lead.targeted);
            default:
                return leads;
        }
    }

    // Automation Engine
    startAutomation() {
        if (this.isAutomationRunning) return;
        
        this.isAutomationRunning = true;
        this.isPaused = false;
        
        this.updateAutomationStatus('running', 'Running');
        
        const startBtn = document.getElementById('startAutomation');
        const pauseBtn = document.getElementById('pauseAutomation');
        const stopBtn = document.getElementById('stopAutomation');
        
        if (startBtn) startBtn.disabled = true;
        if (pauseBtn) pauseBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = false;
        
        this.automationInterval = setInterval(() => {
            if (!this.isPaused) {
                this.processEmailQueue();
            }
        }, this.settings.sendIntervalSeconds * 1000);
        
        this.showToast('Email automation started!', 'success');
        this.logActivity('Email automation started', 'success');
    }

    pauseAutomation() {
        if (!this.isAutomationRunning) return;
        
        this.isPaused = true;
        this.updateAutomationStatus('paused', 'Paused');
        
        this.showToast('Email automation paused', 'warning');
        this.logActivity('Email automation paused', 'warning');
    }

    stopAutomation() {
        if (!this.isAutomationRunning) return;
        
        this.isAutomationRunning = false;
        this.isPaused = false;
        
        if (this.automationInterval) {
            clearInterval(this.automationInterval);
            this.automationInterval = null;
        }
        
        this.updateAutomationStatus('stopped', 'Stopped');
        
        const startBtn = document.getElementById('startAutomation');
        const pauseBtn = document.getElementById('pauseAutomation');
        const stopBtn = document.getElementById('stopAutomation');
        
        if (startBtn) startBtn.disabled = false;
        if (pauseBtn) pauseBtn.disabled = true;
        if (stopBtn) stopBtn.disabled = true;
        
        this.showToast('Email automation stopped', 'info');
        this.logActivity('Email automation stopped', 'info');
    }

    updateAutomationStatus(status, text) {
        const statusElement = document.getElementById('automationStatus');
        if (!statusElement) return;
        
        const dot = statusElement.querySelector('.status-dot');
        const textElement = statusElement.querySelector('.status-text');
        
        if (dot) dot.className = `status-dot ${status}`;
        if (textElement) textElement.textContent = text;
    }

    async processEmailQueue() {
        try {
            // Get active campaigns
            const campaigns = await this.getAllFromStore('campaigns');
            const activeCampaigns = campaigns.filter(c => c.status === 'active');
            
            if (activeCampaigns.length === 0) return;
            
            // Check if we can send (working hours, daily limits, etc.)
            if (!this.canSendNow()) return;
            
            // Process each active campaign
            for (const campaign of activeCampaigns) {
                await this.processCampaignEmails(campaign);
            }
            
            this.updateStats();
        } catch (error) {
            console.error('Error processing email queue:', error);
            this.logActivity('Error processing email queue', 'error');
        }
    }

    canSendNow() {
        const now = new Date();
        const hour = now.getHours();
        const dayName = now.toLocaleDateString('en', { weekday: 'long' }).toLowerCase();
        
        // Check working hours
        if (hour < this.settings.workingHoursStart || hour >= this.settings.workingHoursEnd) {
            return false;
        }
        
        // Check working days
        if (!this.settings.workingDays.includes(dayName)) {
            return false;
        }
        
        // Check daily limits (simplified)
        if (this.stats.sentToday >= this.settings.dailySendLimit) {
            return false;
        }
        
        return true;
    }

    async processCampaignEmails(campaign) {
        // Simulate sending emails
        const leads = await this.getAllFromStore('leads');
        const template = await this.getFromStore('templates', campaign.templateId);
        
        if (!template) return;
        
        // Get leads for this campaign that haven't been sent to yet
        const targetLeads = this.filterLeadsForCampaign(leads, campaign.leadsFilter)
            .filter(lead => !lead[`campaign_${campaign.id}_sent`])
            .slice(0, 3); // Limit to 3 emails per cycle
        
        for (const lead of targetLeads) {
            await this.sendEmail(lead, template, campaign);
            
            // Mark lead as sent for this campaign
            lead[`campaign_${campaign.id}_sent`] = true;
            // Update lead in database (simplified)
            
            this.stats.emailsSent++;
            this.stats.sentToday++;
            
            this.logActivity(`Email sent to ${lead.email}`, 'success');
        }
        
        // Update campaign stats
        campaign.sentCount = (campaign.sentCount || 0) + targetLeads.length;
        // Update campaign in database (simplified)
    }

    async sendEmail(lead, template, campaign) {
        // Simulate email sending
        const personalizedSubject = this.replaceMergeTags(template.subject, lead);
        const personalizedBody = this.replaceMergeTags(template.body, lead);
        
        const email = {
            leadId: lead.id,
            campaignId: campaign.id,
            subject: personalizedSubject,
            body: personalizedBody + '\n\n' + this.settings.signature,
            status: 'sent',
            sentAt: new Date().toISOString()
        };
        
        await this.saveToStore('emails', email);
        
        // Simulate random success/failure
        if (Math.random() > 0.1) { // 90% success rate
            email.status = 'delivered';
            
            // Simulate opens (20% chance)
            if (Math.random() < 0.2) {
                setTimeout(async () => {
                    email.openedAt = new Date().toISOString();
                    // Update email in database (simplified)
                }, Math.random() * 60000); // Random delay up to 1 minute
            }
        } else {
            email.status = 'failed';
            this.logActivity(`Email failed to send to ${lead.email}`, 'error');
        }
    }

    // Analytics & Statistics
    async updateStats() {
        const leads = await this.getAllFromStore('leads');
        const emails = await this.getAllFromStore('emails');
        const campaigns = await this.getAllFromStore('campaigns');
        
        this.stats.totalLeads = leads.length;
        this.stats.emailsSent = emails.filter(e => e.status === 'sent' || e.status === 'delivered').length;
        this.stats.activeCampaigns = campaigns.filter(c => c.status === 'active').length;
        
        const delivered = emails.filter(e => e.status === 'delivered').length;
        const sent = emails.filter(e => e.status === 'sent' || e.status === 'delivered').length;
        this.stats.successRate = sent > 0 ? Math.round((delivered / sent) * 100) : 0;
        
        // Update UI
        const totalLeadsEl = document.getElementById('totalLeads');
        const emailsSentEl = document.getElementById('emailsSent');
        const successRateEl = document.getElementById('successRate');
        const activeCampaignsEl = document.getElementById('activeCampaigns');
        const queueCountEl = document.getElementById('queueCount');
        const sentTodayEl = document.getElementById('sentToday');
        
        if (totalLeadsEl) totalLeadsEl.textContent = this.stats.totalLeads;
        if (emailsSentEl) emailsSentEl.textContent = this.stats.emailsSent;
        if (successRateEl) successRateEl.textContent = `${this.stats.successRate}%`;
        if (activeCampaignsEl) activeCampaignsEl.textContent = this.stats.activeCampaigns;
        if (queueCountEl) queueCountEl.textContent = this.getQueueCount();
        if (sentTodayEl) sentTodayEl.textContent = this.stats.sentToday;
        
        // Update queue stats
        this.updateQueueStats();
    }

    getQueueCount() {
        // Simplified queue count calculation
        return Math.max(0, this.stats.totalLeads - this.stats.emailsSent);
    }

    updateQueueStats() {
        const queueCount = this.getQueueCount();
        const queuePendingEl = document.getElementById('queuePending');
        const queueSendingEl = document.getElementById('queueSending');
        const queueSentEl = document.getElementById('queueSent');
        const queueFailedEl = document.getElementById('queueFailed');
        
        if (queuePendingEl) queuePendingEl.textContent = queueCount;
        if (queueSendingEl) queueSendingEl.textContent = this.isAutomationRunning && !this.isPaused ? 1 : 0;
        if (queueSentEl) queueSentEl.textContent = this.stats.emailsSent;
        if (queueFailedEl) queueFailedEl.textContent = Math.floor(this.stats.emailsSent * 0.1); // Estimate 10% failure rate
    }

    async loadAnalytics() {
        const emails = await this.getAllFromStore('emails');
        const total = emails.length;
        
        const analyticsOpenedEl = document.getElementById('analyticsOpened');
        const analyticsClickedEl = document.getElementById('analyticsClicked');
        const analyticsResponseEl = document.getElementById('analyticsResponse');
        const analyticsBounceEl = document.getElementById('analyticsBounce');
        
        if (total === 0) {
            if (analyticsOpenedEl) analyticsOpenedEl.textContent = '0%';
            if (analyticsClickedEl) analyticsClickedEl.textContent = '0%';
            if (analyticsResponseEl) analyticsResponseEl.textContent = '0%';
            if (analyticsBounceEl) analyticsBounceEl.textContent = '0%';
            return;
        }
        
        const opened = emails.filter(e => e.openedAt).length;
        const clicked = Math.floor(opened * 0.3); // Simulate 30% of opens result in clicks
        const responses = Math.floor(clicked * 0.1); // Simulate 10% of clicks result in responses
        const bounces = emails.filter(e => e.status === 'failed').length;
        
        if (analyticsOpenedEl) analyticsOpenedEl.textContent = `${Math.round((opened / total) * 100)}%`;
        if (analyticsClickedEl) analyticsClickedEl.textContent = `${Math.round((clicked / total) * 100)}%`;
        if (analyticsResponseEl) analyticsResponseEl.textContent = `${Math.round((responses / total) * 100)}%`;
        if (analyticsBounceEl) analyticsBounceEl.textContent = `${Math.round((bounces / total) * 100)}%`;
    }

    // Logging System
    async logActivity(message, level = 'info') {
        const log = {
            message,
            level,
            timestamp: new Date().toISOString()
        };
        
        await this.saveToStore('logs', log);
        this.updateActivityLog();
        this.updateSystemLogs();
    }

    async updateActivityLog() {
        const logs = await this.getAllFromStore('logs');
        const recentLogs = logs.slice(-10).reverse();
        
        const container = document.getElementById('recentActivity');
        if (!container) return;
        
        container.innerHTML = '';
        
        recentLogs.forEach(log => {
            const item = document.createElement('div');
            item.className = 'activity-item';
            item.innerHTML = `
                <span class="activity-time">${this.formatTime(log.timestamp)}</span>
                <span class="activity-message">${log.message}</span>
            `;
            container.appendChild(item);
        });
    }

    async updateSystemLogs() {
        const logs = await this.getAllFromStore('logs');
        const recentLogs = logs.slice(-50).reverse();
        
        const container = document.getElementById('systemLogs');
        if (!container) return;
        
        container.innerHTML = '';
        
        recentLogs.forEach(log => {
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.innerHTML = `
                <span class="log-timestamp">${this.formatTime(log.timestamp)}</span>
                <span class="log-level ${log.level}">${log.level.toUpperCase()}</span>
                <span class="log-message">${log.message}</span>
            `;
            container.appendChild(entry);
        });
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString('en', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    // Settings Management
    loadSettings() {
        // Load from localStorage for now (simplified)
        const savedSettings = localStorage.getItem('emailbot_settings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
        
        // Update UI
        const sendIntervalEl = document.getElementById('sendInterval');
        const dailyLimitEl = document.getElementById('dailyLimit');
        const workingHoursStartEl = document.getElementById('workingHoursStart');
        const workingHoursEndEl = document.getElementById('workingHoursEnd');
        const emailSignatureEl = document.getElementById('emailSignature');
        const includeUnsubscribeEl = document.getElementById('includeUnsubscribe');
        const trackOpensEl = document.getElementById('trackOpens');
        
        if (sendIntervalEl) sendIntervalEl.value = this.settings.sendIntervalSeconds;
        if (dailyLimitEl) dailyLimitEl.value = this.settings.dailySendLimit;
        if (workingHoursStartEl) workingHoursStartEl.value = String(this.settings.workingHoursStart).padStart(2, '0') + ':00';
        if (workingHoursEndEl) workingHoursEndEl.value = String(this.settings.workingHoursEnd).padStart(2, '0') + ':00';
        if (emailSignatureEl) emailSignatureEl.value = this.settings.signature;
        if (includeUnsubscribeEl) includeUnsubscribeEl.checked = this.settings.unsubscribeLink;
        if (trackOpensEl) trackOpensEl.checked = this.settings.trackOpens;
    }

    saveSettings() {
        const sendIntervalEl = document.getElementById('sendInterval');
        const dailyLimitEl = document.getElementById('dailyLimit');
        const workingHoursStartEl = document.getElementById('workingHoursStart');
        const workingHoursEndEl = document.getElementById('workingHoursEnd');
        const emailSignatureEl = document.getElementById('emailSignature');
        const includeUnsubscribeEl = document.getElementById('includeUnsubscribe');
        const trackOpensEl = document.getElementById('trackOpens');
        
        if (sendIntervalEl) this.settings.sendIntervalSeconds = parseInt(sendIntervalEl.value);
        if (dailyLimitEl) this.settings.dailySendLimit = parseInt(dailyLimitEl.value);
        if (workingHoursStartEl) this.settings.workingHoursStart = parseInt(workingHoursStartEl.value.split(':')[0]);
        if (workingHoursEndEl) this.settings.workingHoursEnd = parseInt(workingHoursEndEl.value.split(':')[0]);
        if (emailSignatureEl) this.settings.signature = emailSignatureEl.value;
        if (includeUnsubscribeEl) this.settings.unsubscribeLink = includeUnsubscribeEl.checked;
        if (trackOpensEl) this.settings.trackOpens = trackOpensEl.checked;
        
        localStorage.setItem('emailbot_settings', JSON.stringify(this.settings));
        this.showToast('Settings saved successfully!', 'success');
        this.logActivity('Settings saved', 'info');
    }

    // Import/Export Functions
    exportLeads() {
        this.getAllFromStore('leads').then(leads => {
            const csv = this.convertToCSV(leads);
            this.downloadFile(csv, 'leads.csv', 'text/csv');
            this.showToast('Leads exported successfully!', 'success');
        });
    }

    importLeads() {
        const fileInput = document.getElementById('importLeadsFile');
        const file = fileInput?.files[0];
        
        if (!file) {
            this.showToast('Please select a file to import', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const csv = e.target.result;
                const leads = this.parseCSV(csv);
                
                for (const lead of leads) {
                    lead.status = 'active';
                    lead.source = 'import';
                    lead.created = new Date().toISOString().split('T')[0];
                    await this.saveToStore('leads', lead);
                }
                
                await this.loadLeadsTable();
                this.updateStats();
                this.showToast(`Imported ${leads.length} leads successfully!`, 'success');
                this.logActivity(`Imported ${leads.length} leads`, 'info');
            } catch (error) {
                this.showToast('Error importing leads: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    createBackup() {
        Promise.all([
            this.getAllFromStore('leads'),
            this.getAllFromStore('templates'),
            this.getAllFromStore('campaigns'),
            this.getAllFromStore('emails'),
            this.getAllFromStore('logs')
        ]).then(([leads, templates, campaigns, emails, logs]) => {
            const backup = {
                timestamp: new Date().toISOString(),
                version: '1.0',
                data: { leads, templates, campaigns, emails, logs },
                settings: this.settings
            };
            
            const json = JSON.stringify(backup, null, 2);
            this.downloadFile(json, `emailbot-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
            this.showToast('Backup created successfully!', 'success');
        });
    }

    restoreBackup() {
        const fileInput = document.getElementById('restoreBackupFile');
        const file = fileInput?.files[0];
        
        if (!file) {
            this.showToast('Please select a backup file to restore', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const backup = JSON.parse(e.target.result);
                
                if (!backup.data || !backup.settings) {
                    throw new Error('Invalid backup file format');
                }
                
                // Clear existing data
                await this.clearAllData();
                
                // Restore data
                for (const [storeName, items] of Object.entries(backup.data)) {
                    for (const item of items) {
                        await this.saveToStore(storeName, item);
                    }
                }
                
                // Restore settings
                this.settings = { ...this.settings, ...backup.settings };
                localStorage.setItem('emailbot_settings', JSON.stringify(this.settings));
                this.loadSettings();
                
                this.updateStats();
                this.showToast('Backup restored successfully!', 'success');
                this.logActivity('Backup restored', 'info');
            } catch (error) {
                this.showToast('Error restoring backup: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => 
                    JSON.stringify(row[header] || '')
                ).join(',')
            )
        ].join('\n');
        
        return csvContent;
    }

    parseCSV(csv) {
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = lines[i].split(',');
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] ? values[index].replace(/"/g, '').trim() : '';
                });
                data.push(row);
            }
        }
        
        return data;
    }

    downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    // Utility Functions
    async loadSampleDataIfEmpty() {
        const leads = await this.getAllFromStore('leads');
        const templates = await this.getAllFromStore('templates');
        
        if (leads.length === 0) {
            for (const lead of this.sampleData.leads) {
                await this.saveToStore('leads', lead);
            }
        }
        
        if (templates.length === 0) {
            for (const template of this.sampleData.templates) {
                await this.saveToStore('templates', template);
            }
        }
    }

    startPeriodicUpdates() {
        // Update stats every 30 seconds
        setInterval(() => {
            this.updateStats();
        }, 30000);
        
        // Reset daily counters at midnight
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        setTimeout(() => {
            this.stats.sentToday = 0;
            this.updateStats();
            
            // Set up daily reset interval
            setInterval(() => {
                this.stats.sentToday = 0;
                this.updateStats();
            }, 24 * 60 * 60 * 1000);
        }, tomorrow.getTime() - now.getTime());
    }

    toggleTheme() {
        const currentScheme = document.documentElement.getAttribute('data-color-scheme');
        const newScheme = currentScheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-color-scheme', newScheme);
        localStorage.setItem('emailbot_theme', newScheme);
        this.showToast(`Switched to ${newScheme} mode`, 'info');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${message}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
    }

    showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.remove('hidden');
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.add('hidden');
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('hidden');
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('hidden');
    }

    // Lead Management
    editLead(leadId) {
        this.showToast('Edit lead functionality coming soon!', 'info');
    }

    async deleteLead(leadId) {
        if (!confirm('Are you sure you want to delete this lead?')) return;
        
        const transaction = this.db.transaction(['leads'], 'readwrite');
        const store = transaction.objectStore('leads');
        await store.delete(leadId);
        
        await this.loadLeadsTable();
        this.updateStats();
        this.showToast('Lead deleted successfully!', 'success');
    }

    async clearAllLeads() {
        if (!confirm('Are you sure you want to delete ALL leads? This cannot be undone.')) return;
        
        const transaction = this.db.transaction(['leads'], 'readwrite');
        const store = transaction.objectStore('leads');
        await store.clear();
        
        await this.loadLeadsTable();
        this.updateStats();
        this.showToast('All leads cleared!', 'success');
        this.logActivity('All leads cleared', 'warning');
    }

    async clearAllData() {
        if (!confirm('Are you sure you want to delete ALL data? This cannot be undone.')) return;
        
        const stores = ['leads', 'templates', 'campaigns', 'emails', 'logs'];
        const transaction = this.db.transaction(stores, 'readwrite');
        
        for (const storeName of stores) {
            const store = transaction.objectStore(storeName);
            await store.clear();
        }
        
        this.stats = {
            totalLeads: 0,
            emailsSent: 0,
            successRate: 0,
            activeCampaigns: 0,
            sentToday: 0
        };
        
        this.updateStats();
        this.showToast('All data cleared!', 'warning');
        
        // Don't reload to avoid losing current session
        await this.loadSampleDataIfEmpty();
        this.updateStats();
    }

    resetSettings() {
        if (!confirm('Reset all settings to default values?')) return;
        
        localStorage.removeItem('emailbot_settings');
        this.settings = {
            dailySendLimit: 500,
            sendIntervalSeconds: 30,
            workingHoursStart: 9,
            workingHoursEnd: 17,
            workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            signature: 'Best regards,\nYour Marketing Team',
            unsubscribeLink: true,
            trackOpens: true,
            aiProvider: 'huggingface',
            corsProxy: 'https://cors-anywhere.herokuapp.com/'
        };
        this.loadSettings();
        this.showToast('Settings reset to defaults!', 'info');
    }

    // Campaign methods
    startCampaign(campaignId) {
        this.showToast(`Campaign ${campaignId} started!`, 'success');
        this.logActivity(`Campaign ${campaignId} started`, 'info');
    }

    pauseCampaign(campaignId) {
        this.showToast(`Campaign ${campaignId} paused!`, 'warning');
        this.logActivity(`Campaign ${campaignId} paused`, 'warning');
    }

    async deleteCampaign(campaignId) {
        if (!confirm('Are you sure you want to delete this campaign?')) return;
        
        const transaction = this.db.transaction(['campaigns'], 'readwrite');
        const store = transaction.objectStore('campaigns');
        await store.delete(campaignId);
        
        await this.loadCampaigns();
        this.updateStats();
        this.showToast('Campaign deleted successfully!', 'success');
    }
}

// Initialize the application
let app = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing EmailBot Pro...');
    
    // Load saved theme
    const savedTheme = localStorage.getItem('emailbot_theme') || 'light';
    document.documentElement.setAttribute('data-color-scheme', savedTheme);
    
    // Initialize app
    app = new EmailBotApp();
    
    // Make app globally available
    window.app = app;
});

// Global functions for HTML onclick events - moved outside class
window.showSection = (sectionName) => {
    if (window.app) {
        window.app.showSection(sectionName);
    }
};

window.closeModal = (modalId) => {
    if (window.app) {
        window.app.closeModal(modalId);
    }
};

// Service Worker for background processing (optional)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('data:application/javascript,console.log("EmailBot SW loaded");')
        .catch(err => console.log('ServiceWorker registration failed'));
}

// Keep the app alive (prevent tab suspension)
setInterval(() => {
    // Minimal activity to prevent browser from suspending the tab
    console.log('EmailBot Pro heartbeat:', new Date().toLocaleTimeString());
}, 30000);