// 表單欄位類型定義
export interface FormField {
  id: string
  name: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'radio' | 'file'
  required: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
  validation?: {
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
    pattern?: string
    custom?: (value: any) => string | null
  }
  defaultValue?: any
  description?: string
  category?: string
  dependsOn?: string // 依賴其他欄位
  showWhen?: (formData: Record<string, any>) => boolean // 條件顯示
}

// 表單分組定義
export interface FormSection {
  id: string
  title: string
  description?: string
  fields: FormField[]
  collapsible?: boolean
  defaultExpanded?: boolean
}

// 完整表單配置
export interface FormConfig {
  id: string
  name: string
  version: string
  description: string
  sections: FormSection[]
  submitUrl: string
  downloadUrl: string
}

// 共用欄位定義 - 避免重複定義
export const COMMON_FIELDS: Record<string, FormField> = {
  // 工程基本資訊
  projectName: {
    id: 'projectName',
    name: 'projectName',
    label: '工程名稱',
    type: 'text',
    required: true,
    placeholder: '請輸入工程名稱',
    validation: {
      minLength: 2,
      maxLength: 100
    },
    category: '基本資訊'
  },
  
  // A-5 專用欄位
  constructionId: {
    id: 'constructionId',
    name: 'constructionId',
    label: '工程編號',
    type: 'text',
    required: true,
    placeholder: '請輸入工程編號',
    category: '工程資訊'
  },
  
  title: {
    id: 'title',
    name: 'title',
    label: '表單標題',
    type: 'text',
    required: true,
    placeholder: '請輸入表單標題',
    category: '工程資訊'
  },
  
  supervisoryName: {
    id: 'supervisoryName',
    name: 'supervisoryName',
    label: '監工姓名',
    type: 'text',
    required: false,
    placeholder: '請輸入監工姓名',
    category: '監工資訊'
  },
  
  supervisoryFactory: {
    id: 'supervisoryFactory',
    name: 'supervisoryFactory',
    label: '監工地址',
    type: 'text',
    required: false,
    placeholder: '請輸入監工地址',
    category: '監工資訊'
  },
  
  contractDate: {
    id: 'contractDate',
    name: 'contractDate',
    label: '簽約日期',
    type: 'date',
    required: false,
    category: '時程資訊'
  },
  
  workedDay: {
    id: 'workedDay',
    name: 'workedDay',
    label: '工作天數',
    type: 'number',
    required: false,
    placeholder: '請輸入工作天數',
    validation: {
      min: 1,
      max: 3650
    },
    category: '時程資訊'
  },
  
  disbursementAdvancePayment: {
    id: 'disbursementAdvancePayment',
    name: 'disbursementAdvancePayment',
    label: '預付款金額',
    type: 'number',
    required: false,
    placeholder: '請輸入預付款金額',
    validation: {
      min: 0
    },
    category: '財務資訊'
  },
  
  estimateAmount: {
    id: 'estimateAmount',
    name: 'estimateAmount',
    label: '預估金額',
    type: 'number',
    required: false,
    placeholder: '請輸入預估金額',
    validation: {
      min: 0
    },
    category: '財務資訊'
  },
  
  adjustPriceIndex: {
    id: 'adjustPriceIndex',
    name: 'adjustPriceIndex',
    label: '物價調整指數',
    type: 'number',
    required: false,
    placeholder: '請輸入物價調整指數',
    validation: {
      min: 0,
      max: 200
    },
    category: '財務資訊'
  },
  
  deductAmount: {
    id: 'deductAmount',
    name: 'deductAmount',
    label: '扣款金額',
    type: 'number',
    required: false,
    placeholder: '請輸入扣款金額',
    validation: {
      min: 0
    },
    category: '財務資訊'
  },
  
  retention: {
    id: 'retention',
    name: 'retention',
    label: '保留款',
    type: 'number',
    required: false,
    placeholder: '請輸入保留款',
    validation: {
      min: 0
    },
    category: '財務資訊'
  },
  
  deductionAdvancePayment: {
    id: 'deductionAdvancePayment',
    name: 'deductionAdvancePayment',
    label: '預付款扣款',
    type: 'number',
    required: false,
    placeholder: '請輸入預付款扣款',
    validation: {
      min: 0
    },
    category: '財務資訊'
  },
  
  comment: {
    id: 'comment',
    name: 'comment',
    label: '備註',
    type: 'textarea',
    required: false,
    placeholder: '請輸入備註',
    category: '其他資訊'
  },
  
  deductedColumnReason: {
    id: 'deductedColumnReason',
    name: 'deductedColumnReason',
    label: '扣款原因',
    type: 'textarea',
    required: false,
    placeholder: '請輸入扣款原因',
    category: '其他資訊'
  },
  
  explainActualAmount: {
    id: 'explainActualAmount',
    name: 'explainActualAmount',
    label: '實際金額說明',
    type: 'textarea',
    required: false,
    placeholder: '請輸入實際金額說明',
    category: '其他資訊'
  },
  
  projectLocation: {
    id: 'projectLocation',
    name: 'projectLocation',
    label: '工程地點',
    type: 'text',
    required: true,
    placeholder: '請輸入工程地點',
    validation: {
      minLength: 5,
      maxLength: 200
    },
    category: '基本資訊'
  },
  
  projectOwner: {
    id: 'projectOwner',
    name: 'projectOwner',
    label: '業主單位',
    type: 'text',
    required: true,
    placeholder: '請輸入業主單位名稱',
    category: '基本資訊'
  },
  
  contractorName: {
    id: 'contractorName',
    name: 'contractorName',
    label: '承包商名稱',
    type: 'text',
    required: true,
    placeholder: '請輸入承包商名稱',
    category: '基本資訊'
  },
  
  projectManager: {
    id: 'projectManager',
    name: 'projectManager',
    label: '工程主辦',
    type: 'text',
    required: true,
    placeholder: '請輸入工程主辦姓名',
    category: '基本資訊'
  },
  
  supervisorUnit: {
    id: 'supervisorUnit',
    name: 'supervisorUnit',
    label: '監造單位',
    type: 'text',
    required: true,
    placeholder: '請輸入監造單位名稱',
    category: '基本資訊'
  },
  
  // 時程相關
  startDate: {
    id: 'startDate',
    name: 'startDate',
    label: '開工日期',
    type: 'date',
    required: true,
    category: '時程'
  },
  
  endDate: {
    id: 'endDate',
    name: 'endDate',
    label: '預定完工日期',
    type: 'date',
    required: true,
    category: '時程'
  },
  
  constructionPeriod: {
    id: 'constructionPeriod',
    name: 'constructionPeriod',
    label: '施工期間（天）',
    type: 'number',
    required: true,
    validation: {
      min: 1,
      max: 3650
    },
    category: '時程'
  },
  
  // 預算相關
  contractAmount: {
    id: 'contractAmount',
    name: 'contractAmount',
    label: '契約金額',
    type: 'number',
    required: true,
    placeholder: '請輸入契約金額（元）',
    validation: {
      min: 0
    },
    category: '預算'
  },
  
  // 工程類型
  projectType: {
    id: 'projectType',
    name: 'projectType',
    label: '工程類別',
    type: 'select',
    required: true,
    options: [
      { value: 'building', label: '建築工程' },
      { value: 'civil', label: '土木工程' },
      { value: 'mechanical', label: '機械工程' },
      { value: 'electrical', label: '電機工程' },
      { value: 'environmental', label: '環境工程' },
      { value: 'other', label: '其他' }
    ],
    category: '基本資訊'
  },
  
  projectScale: {
    id: 'projectScale',
    name: 'projectScale',
    label: '工程規模',
    type: 'select',
    required: true,
    options: [
      { value: 'small', label: '小型工程（<1千萬）' },
      { value: 'medium', label: '中型工程（1千萬-1億）' },
      { value: 'large', label: '大型工程（1億-10億）' },
      { value: 'mega', label: '巨型工程（>10億）' }
    ],
    category: '基本資訊'
  },
  
  // 聯絡資訊
  contactPerson: {
    id: 'contactPerson',
    name: 'contactPerson',
    label: '聯絡人',
    type: 'text',
    required: true,
    placeholder: '請輸入聯絡人姓名',
    category: '聯絡資訊'
  },
  
  contactPhone: {
    id: 'contactPhone',
    name: 'contactPhone',
    label: '聯絡電話',
    type: 'text',
    required: true,
    placeholder: '請輸入聯絡電話',
    validation: {
      pattern: '^[0-9\\-\\+\\(\\)\\s]+$'
    },
    category: '聯絡資訊'
  },
  
  contactEmail: {
    id: 'contactEmail',
    name: 'contactEmail',
    label: '電子郵件',
    type: 'text',
    required: false,
    placeholder: '請輸入電子郵件',
    validation: {
      pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
    },
    category: '聯絡資訊'
  },
  
  // 品質管制相關
  qualityStandard: {
    id: 'qualityStandard',
    name: 'qualityStandard',
    label: '品質標準',
    type: 'select',
    required: true,
    options: [
      { value: 'cns', label: 'CNS國家標準' },
      { value: 'astm', label: 'ASTM美國標準' },
      { value: 'jis', label: 'JIS日本標準' },
      { value: 'iso', label: 'ISO國際標準' },
      { value: 'custom', label: '客製化標準' }
    ],
    category: '品質管制'
  },
  
  inspectionMethod: {
    id: 'inspectionMethod',
    name: 'inspectionMethod',
    label: '檢驗方式',
    type: 'checkbox',
    required: true,
    options: [
      { value: 'visual', label: '目視檢查' },
      { value: 'measurement', label: '尺寸測量' },
      { value: 'material_test', label: '材料試驗' },
      { value: 'ndt', label: '非破壞檢測' },
      { value: 'load_test', label: '載重試驗' }
    ],
    category: '品質管制'
  },
  
  // 安全衛生相關
  safetyLevel: {
    id: 'safetyLevel',
    name: 'safetyLevel',
    label: '安全等級',
    type: 'select',
    required: true,
    options: [
      { value: 'general', label: '一般等級' },
      { value: 'high', label: '高風險等級' },
      { value: 'special', label: '特殊等級' }
    ],
    category: '安全衛生'
  },
  
  // 環境保護
  environmentalImpact: {
    id: 'environmentalImpact',
    name: 'environmentalImpact',
    label: '環境影響評估',
    type: 'radio',
    required: true,
    options: [
      { value: 'low', label: '低度影響' },
      { value: 'medium', label: '中度影響' },
      { value: 'high', label: '高度影響' }
    ],
    category: '環境保護'
  }
}

// A-5 施工計畫書配置
export const A5_FORM_CONFIG: FormConfig = {
  id: 'A-5',
  name: '施工計畫書',
  version: '2.1',
  description: '工程施工計畫書是確保工程順利進行的重要文件',
  submitUrl: '/management/construction/a5/update',
  downloadUrl: '/management/construction/export/report/AFive',
  sections: [
    {
      id: 'project_info',
      title: '工程資訊',
      description: '請填寫工程的基本資訊',
      defaultExpanded: true,
      fields: [
        COMMON_FIELDS.constructionId,
        COMMON_FIELDS.title,
        COMMON_FIELDS.projectName,
        COMMON_FIELDS.projectLocation,
        COMMON_FIELDS.projectOwner,
        COMMON_FIELDS.contractorName,
        COMMON_FIELDS.projectManager,
        COMMON_FIELDS.supervisorUnit,
        COMMON_FIELDS.projectType,
        COMMON_FIELDS.projectScale
      ]
    },
    {
      id: 'supervisory_info',
      title: '監工資訊',
      description: '請填寫監工相關資訊',
      fields: [
        COMMON_FIELDS.supervisoryName,
        COMMON_FIELDS.supervisoryFactory
      ]
    },
    
    {
      id: 'schedule',
      title: '施工時程',
      description: '請填寫施工相關時程資訊',
      fields: [
        COMMON_FIELDS.contractDate,
        COMMON_FIELDS.startDate,
        COMMON_FIELDS.endDate,
        COMMON_FIELDS.constructionPeriod,
        COMMON_FIELDS.workedDay,
        {
          id: 'milestones',
          name: 'milestones',
          label: '重要里程碑',
          type: 'textarea',
          required: true,
          placeholder: '請列出重要的施工里程碑',
          validation: {
            minLength: 10,
            maxLength: 1000
          },
          category: '時程'
        }
      ]
    },
    {
      id: 'construction_method',
      title: '施工方法',
      description: '請詳細說明施工方法與程序',
      fields: [
        {
          id: 'constructionSequence',
          name: 'constructionSequence',
          label: '施工順序',
          type: 'textarea',
          required: true,
          placeholder: '請詳述施工順序與步驟',
          validation: {
            minLength: 50,
            maxLength: 2000
          },
          category: '施工方法'
        },
        {
          id: 'equipment',
          name: 'equipment',
          label: '主要施工設備',
          type: 'textarea',
          required: true,
          placeholder: '請列出主要施工設備清單',
          category: '施工方法'
        },
        {
          id: 'workforce',
          name: 'workforce',
          label: '人力配置',
          type: 'number',
          required: true,
          placeholder: '預估所需人力數量',
          validation: {
            min: 1,
            max: 1000
          },
          category: '施工方法'
        }
      ]
    },
    {
      id: 'safety',
      title: '安全衛生計畫',
      description: '請填寫安全衛生相關措施',
      fields: [
        COMMON_FIELDS.safetyLevel,
        {
          id: 'safetyMeasures',
          name: 'safetyMeasures',
          label: '安全防護措施',
          type: 'textarea',
          required: true,
          placeholder: '請詳述安全防護措施',
          category: '安全衛生'
        },
        {
          id: 'emergencyPlan',
          name: 'emergencyPlan',
          label: '緊急應變計畫',
          type: 'textarea',
          required: true,
          placeholder: '請說明緊急應變處理程序',
          category: '安全衛生'
        }
      ]
    },
    {
      id: 'budget',
      title: '預算規劃',
      description: '請填寫預算相關資訊',
      fields: [
        COMMON_FIELDS.contractAmount,
        COMMON_FIELDS.disbursementAdvancePayment,
        COMMON_FIELDS.estimateAmount,
        COMMON_FIELDS.adjustPriceIndex,
        COMMON_FIELDS.deductAmount,
        COMMON_FIELDS.retention,
        COMMON_FIELDS.deductionAdvancePayment,
        {
          id: 'costBreakdown',
          name: 'costBreakdown',
          label: '成本分析',
          type: 'textarea',
          required: true,
          placeholder: '請說明主要成本項目分析',
          category: '預算'
        }
      ]
    },
    {
      id: 'other_info',
      title: '其他資訊',
      description: '請填寫其他相關資訊',
      fields: [
        COMMON_FIELDS.comment,
        COMMON_FIELDS.deductedColumnReason,
        COMMON_FIELDS.explainActualAmount
      ]
    },
    
    {
      id: 'contact',
      title: '聯絡資訊',
      description: '請填寫相關聯絡資訊',
      collapsible: true,
      fields: [
        COMMON_FIELDS.contactPerson,
        COMMON_FIELDS.contactPhone,
        COMMON_FIELDS.contactEmail
      ]
    }
  ]
}

// A-7 品質管制計畫配置
export const A7_FORM_CONFIG: FormConfig = {
  id: 'A-7',
  name: '品質管制計畫',
  version: '3.0',
  description: '品質管制計畫是確保工程品質符合規範要求的重要文件',
  submitUrl: '/management/construction/a7/update',
  downloadUrl: '/management/construction/export/report/ASeven',
  sections: [
    {
      id: 'basic_info',
      title: '工程基本資訊',
      description: '請填寫工程的基本資訊',
      defaultExpanded: true,
      fields: [
        COMMON_FIELDS.projectName,
        COMMON_FIELDS.projectLocation,
        COMMON_FIELDS.projectOwner,
        COMMON_FIELDS.contractorName,
        COMMON_FIELDS.supervisorUnit,
        COMMON_FIELDS.projectType
      ]
    },
    {
      id: 'quality_policy',
      title: '品質政策與目標',
      description: '請定義品質政策與目標',
      fields: [
        {
          id: 'qualityPolicy',
          name: 'qualityPolicy',
          label: '品質政策',
          type: 'textarea',
          required: true,
          placeholder: '請說明公司的品質政策',
          validation: {
            minLength: 20,
            maxLength: 500
          },
          category: '品質政策'
        },
        {
          id: 'qualityObjectives',
          name: 'qualityObjectives',
          label: '品質目標',
          type: 'textarea',
          required: true,
          placeholder: '請列出具體的品質目標',
          category: '品質政策'
        }
      ]
    },
    {
      id: 'quality_organization',
      title: '品質管制組織',
      description: '請說明品質管制組織架構',
      fields: [
        {
          id: 'qualityManager',
          name: 'qualityManager',
          label: '品質管理負責人',
          type: 'text',
          required: true,
          placeholder: '請輸入品質管理負責人姓名',
          category: '組織架構'
        },
        {
          id: 'qualityTeam',
          name: 'qualityTeam',
          label: '品質管制團隊',
          type: 'textarea',
          required: true,
          placeholder: '請說明品質管制團隊組成',
          category: '組織架構'
        },
        {
          id: 'responsibilities',
          name: 'responsibilities',
          label: '職責分工',
          type: 'textarea',
          required: true,
          placeholder: '請說明各職位的品質管制職責',
          category: '組織架構'
        }
      ]
    },
    {
      id: 'quality_standards',
      title: '品質標準與規範',
      description: '請說明適用的品質標準',
      fields: [
        COMMON_FIELDS.qualityStandard,
        {
          id: 'specifications',
          name: 'specifications',
          label: '技術規範',
          type: 'textarea',
          required: true,
          placeholder: '請列出適用的技術規範',
          category: '品質標準'
        },
        {
          id: 'acceptanceCriteria',
          name: 'acceptanceCriteria',
          label: '驗收標準',
          type: 'textarea',
          required: true,
          placeholder: '請說明各項工程的驗收標準',
          category: '品質標準'
        }
      ]
    },
    {
      id: 'inspection_plan',
      title: '檢驗測試計畫',
      description: '請說明檢驗測試相關計畫',
      fields: [
        COMMON_FIELDS.inspectionMethod,
        {
          id: 'inspectionSchedule',
          name: 'inspectionSchedule',
          label: '檢驗時程',
          type: 'textarea',
          required: true,
          placeholder: '請說明各階段檢驗時程安排',
          category: '檢驗計畫'
        },
        {
          id: 'testingProcedures',
          name: 'testingProcedures',
          label: '測試程序',
          type: 'textarea',
          required: true,
          placeholder: '請詳述測試程序與方法',
          category: '檢驗計畫'
        }
      ]
    },
    {
      id: 'material_control',
      title: '材料品質管制',
      description: '請說明材料品質管制措施',
      fields: [
        {
          id: 'materialSpecs',
          name: 'materialSpecs',
          label: '材料規格要求',
          type: 'textarea',
          required: true,
          placeholder: '請說明主要材料的規格要求',
          category: '材料管制'
        },
        {
          id: 'supplierQualification',
          name: 'supplierQualification',
          label: '供應商資格',
          type: 'textarea',
          required: true,
          placeholder: '請說明供應商資格要求與評估標準',
          category: '材料管制'
        },
        {
          id: 'receivingInspection',
          name: 'receivingInspection',
          label: '進料檢驗',
          type: 'textarea',
          required: true,
          placeholder: '請說明進料檢驗程序',
          category: '材料管制'
        }
      ]
    },
    {
      id: 'improvement',
      title: '持續改善計畫',
      description: '請說明持續改善相關措施',
      fields: [
        {
          id: 'corrective_action',
          name: 'corrective_action',
          label: '矯正措施',
          type: 'textarea',
          required: true,
          placeholder: '請說明發現問題時的矯正措施程序',
          category: '持續改善'
        },
        {
          id: 'preventive_action',
          name: 'preventive_action',
          label: '預防措施',
          type: 'textarea',
          required: true,
          placeholder: '請說明預防品質問題的措施',
          category: '持續改善'
        }
      ]
    },
    {
      id: 'contact',
      title: '聯絡資訊',
      description: '請填寫相關聯絡資訊',
      collapsible: true,
      fields: [
        COMMON_FIELDS.contactPerson,
        COMMON_FIELDS.contactPhone,
        COMMON_FIELDS.contactEmail
      ]
    }
  ]
}

// 獲取表單配置的輔助函數
export const getFormConfig = (formId: string): FormConfig | null => {
  const configs: Record<string, FormConfig> = {
    'A-5': A5_FORM_CONFIG,
    'A-7': A7_FORM_CONFIG
  }
  
  return configs[formId] || null
}

// 獲取表單所有欄位（扁平化）
export const getFormFields = (formId: string): FormField[] => {
  const config = getFormConfig(formId)
  if (!config) return []
  
  return config.sections.reduce((fields: FormField[], section) => {
    return fields.concat(section.fields)
  }, [])
}

// 獲取表單預設值
export const getFormDefaults = (formId: string): Record<string, any> => {
  const fields = getFormFields(formId)
  const defaults: Record<string, any> = {}
  
  fields.forEach(field => {
    if (field.defaultValue !== undefined) {
      defaults[field.name] = field.defaultValue
    } else {
      // 根據欄位類型設定預設值
      switch (field.type) {
        case 'checkbox':
          defaults[field.name] = []
          break
        case 'number':
          defaults[field.name] = field.validation?.min || 0
          break
        default:
          defaults[field.name] = ''
      }
    }
  })
  
  return defaults
}

// 驗證表單資料
export const validateFormData = (formId: string, data: Record<string, any>): Record<string, string> => {
  const fields = getFormFields(formId)
  const errors: Record<string, string> = {}
  
  fields.forEach(field => {
    const value = data[field.name]
    
    // 必填驗證
    if (field.required && (!value || value === '' || (Array.isArray(value) && value.length === 0))) {
      errors[field.name] = `${field.label}為必填項目`
      return
    }
    
    // 如果有值才進行進一步驗證
    if (value && field.validation) {
      const validation = field.validation
      
      // 字串長度驗證
      if (typeof value === 'string') {
        if (validation.minLength && value.length < validation.minLength) {
          errors[field.name] = `${field.label}至少需要${validation.minLength}個字符`
        }
        if (validation.maxLength && value.length > validation.maxLength) {
          errors[field.name] = `${field.label}不能超過${validation.maxLength}個字符`
        }
        if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
          errors[field.name] = `${field.label}格式不正確`
        }
      }
      
      // 數值驗證
      if (typeof value === 'number') {
        if (validation.min !== undefined && value < validation.min) {
          errors[field.name] = `${field.label}不能小於${validation.min}`
        }
        if (validation.max !== undefined && value > validation.max) {
          errors[field.name] = `${field.label}不能大於${validation.max}`
        }
      }
      
      // 自訂驗證
      if (validation.custom) {
        const customError = validation.custom(value)
        if (customError) {
          errors[field.name] = customError
        }
      }
    }
  })
  
  return errors
}
