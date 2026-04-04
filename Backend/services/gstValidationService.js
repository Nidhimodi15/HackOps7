const axios = require('axios');

class GSTValidationService {
  constructor() {
    // GST validation endpoints (using mock for demo - replace with actual API)
    this.gstApiUrl = 'https://api.gst.gov.in/taxpayerapi/search'; // Mock URL
    this.hsnApiUrl = 'https://api.gst.gov.in/hsn/search'; // Mock URL
    
    // Standard GST rates by HSN categories
    this.standardGSTRates = {
      // Food items
      '1001': 0,  // Wheat
      '1006': 0,  // Rice
      '0401': 0,  // Milk
      
      // Textiles
      '5208': 5,  // Cotton fabrics
      '6109': 12, // T-shirts
      
      // Electronics
      '8517': 18, // Mobile phones
      '8471': 18, // Computers
      
      // Luxury items
      '8703': 28, // Cars
      '2208': 28, // Spirits
      
      // Services
      '9954': 18, // IT services
      '9967': 18  // Consulting services
    };
  }

  /**
   * Validate GST number format and existence
   */
  async validateGSTNumber(gstNumber) {
    try {
      // First validate format
      const formatValidation = this.validateGSTFormat(gstNumber);
      if (!formatValidation.valid) {
        return formatValidation;
      }

      // Then validate with government portal (mock implementation)
      const apiValidation = await this.validateWithGSTPortal(gstNumber);
      
      return {
        valid: apiValidation.valid,
        gstNumber: gstNumber,
        businessName: apiValidation.businessName,
        businessType: apiValidation.businessType,
        registrationDate: apiValidation.registrationDate,
        status: apiValidation.status,
        address: apiValidation.address,
        validatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('GST validation error:', error);
      return {
        valid: false,
        error: error.message,
        gstNumber: gstNumber
      };
    }
  }

  /**
   * Validate GST number format
   */
  validateGSTFormat(gstNumber) {
    if (!gstNumber || typeof gstNumber !== 'string') {
      return { valid: false, error: 'GST number is required' };
    }

    // Remove spaces and convert to uppercase
    const cleanGST = gstNumber.replace(/\s/g, '').toUpperCase();

    // GST format: 22AAAAA0000A1Z5 (15 characters)
    const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[A-Z0-9]{1}$/;

    if (cleanGST.length !== 15) {
      return { valid: false, error: 'GST number must be 15 characters long' };
    }

    if (!gstPattern.test(cleanGST)) {
      return { valid: false, error: 'Invalid GST number format' };
    }

    // Validate state code (first 2 digits)
    const stateCode = parseInt(cleanGST.substring(0, 2));
    if (stateCode < 1 || stateCode > 37) {
      return { valid: false, error: 'Invalid state code in GST number' };
    }

    return { valid: true, cleanGST: cleanGST };
  }

  /**
   * Validate with GST portal (mock implementation)
   */
  async validateWithGSTPortal(gstNumber) {
    try {
      // Mock implementation - in production, use actual GST API
      // For demo purposes, we'll simulate API responses
      
      const mockGSTData = this.getMockGSTData(gstNumber);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return mockGSTData;
    } catch (error) {
      throw new Error(`GST portal validation failed: ${error.message}`);
    }
  }

  /**
   * Mock GST data for demonstration
   */
  getMockGSTData(gstNumber) {
    // Simulate different responses based on GST number
    const stateCode = gstNumber.substring(0, 2);
    const panPart = gstNumber.substring(2, 12);
    
    // Some mock valid GST numbers
    const validGSTNumbers = [
      '22AAAAA0000A1Z5',
      '27AAAAA0000A1Z5',
      '09AAAAA0000A1Z5',
      '29AAAAA0000A1Z5'
    ];

    if (validGSTNumbers.includes(gstNumber)) {
      return {
        valid: true,
        businessName: `Demo Business ${stateCode}`,
        businessType: 'Private Limited Company',
        registrationDate: '2020-04-01',
        status: 'Active',
        address: {
          building: 'Demo Building',
          street: 'Demo Street',
          city: 'Demo City',
          state: this.getStateName(stateCode),
          pincode: '400001'
        }
      };
    } else {
      // Simulate some invalid cases
      return {
        valid: Math.random() > 0.3, // 70% chance of being valid for demo
        businessName: Math.random() > 0.3 ? `Business ${panPart}` : null,
        businessType: 'Private Limited Company',
        registrationDate: '2020-01-01',
        status: Math.random() > 0.1 ? 'Active' : 'Cancelled',
        address: {
          building: 'Business Building',
          street: 'Business Street',
          city: 'Business City',
          state: this.getStateName(stateCode),
          pincode: '400001'
        }
      };
    }
  }

  /**
   * Get state name from state code
   */
  getStateName(stateCode) {
    const states = {
      '01': 'Jammu and Kashmir',
      '02': 'Himachal Pradesh',
      '03': 'Punjab',
      '04': 'Chandigarh',
      '05': 'Uttarakhand',
      '06': 'Haryana',
      '07': 'Delhi',
      '08': 'Rajasthan',
      '09': 'Uttar Pradesh',
      '10': 'Bihar',
      '11': 'Sikkim',
      '12': 'Arunachal Pradesh',
      '13': 'Nagaland',
      '14': 'Manipur',
      '15': 'Mizoram',
      '16': 'Tripura',
      '17': 'Meghalaya',
      '18': 'Assam',
      '19': 'West Bengal',
      '20': 'Jharkhand',
      '21': 'Odisha',
      '22': 'Chhattisgarh',
      '23': 'Madhya Pradesh',
      '24': 'Gujarat',
      '25': 'Daman and Diu',
      '26': 'Dadra and Nagar Haveli',
      '27': 'Maharashtra',
      '28': 'Andhra Pradesh',
      '29': 'Karnataka',
      '30': 'Goa',
      '31': 'Lakshadweep',
      '32': 'Kerala',
      '33': 'Tamil Nadu',
      '34': 'Puducherry',
      '35': 'Andaman and Nicobar Islands',
      '36': 'Telangana',
      '37': 'Andhra Pradesh'
    };
    
    return states[stateCode] || 'Unknown State';
  }

  /**
   * Validate HSN/SAC code and get applicable GST rate
   */
  validateHSNCode(hsnCode) {
    if (!hsnCode) {
      return { valid: false, error: 'HSN/SAC code is required' };
    }

    // HSN codes are typically 4, 6, or 8 digits
    // SAC codes are typically 6 digits
    const cleanHSN = hsnCode.toString().trim();
    
    if (!/^\d{4,8}$/.test(cleanHSN)) {
      return { valid: false, error: 'Invalid HSN/SAC code format' };
    }

    // Get applicable GST rate
    const gstRate = this.getGSTRateForHSN(cleanHSN);
    
    return {
      valid: true,
      hsnCode: cleanHSN,
      applicableGSTRate: gstRate,
      category: this.getHSNCategory(cleanHSN)
    };
  }

  /**
   * Get GST rate for HSN/SAC code
   */
  getGSTRateForHSN(hsnCode) {
    // Check exact match first
    if (this.standardGSTRates[hsnCode]) {
      return this.standardGSTRates[hsnCode];
    }

    // Check by category (first 4 digits)
    const category = hsnCode.substring(0, 4);
    if (this.standardGSTRates[category]) {
      return this.standardGSTRates[category];
    }

    // Default rates based on HSN ranges
    const hsnNum = parseInt(hsnCode);
    
    if (hsnNum >= 1 && hsnNum <= 2499) {
      return 0; // Agricultural products
    } else if (hsnNum >= 2500 && hsnNum <= 3999) {
      return 5; // Basic goods
    } else if (hsnNum >= 4000 && hsnNum <= 6999) {
      return 12; // Standard goods
    } else if (hsnNum >= 7000 && hsnNum <= 8999) {
      return 18; // Electronics and machinery
    } else if (hsnNum >= 9000 && hsnNum <= 9999) {
      return 18; // Services
    }

    return 18; // Default rate
  }

  /**
   * Get HSN category description
   */
  getHSNCategory(hsnCode) {
    const hsnNum = parseInt(hsnCode);
    
    if (hsnNum >= 1 && hsnNum <= 499) return 'Live animals and animal products';
    if (hsnNum >= 500 && hsnNum <= 999) return 'Vegetable products';
    if (hsnNum >= 1500 && hsnNum <= 1599) return 'Animal or vegetable fats and oils';
    if (hsnNum >= 1600 && hsnNum <= 2499) return 'Prepared foodstuffs';
    if (hsnNum >= 2500 && hsnNum <= 2799) return 'Mineral products';
    if (hsnNum >= 2800 && hsnNum <= 3899) return 'Chemicals and allied industries';
    if (hsnNum >= 3900 && hsnNum <= 4099) return 'Plastics and articles thereof';
    if (hsnNum >= 4100 && hsnNum <= 4399) return 'Raw hides and skins, leather';
    if (hsnNum >= 4400 && hsnNum <= 4999) return 'Wood and articles of wood';
    if (hsnNum >= 5000 && hsnNum <= 6399) return 'Textiles and textile articles';
    if (hsnNum >= 6400 && hsnNum <= 6799) return 'Footwear, headgear';
    if (hsnNum >= 6800 && hsnNum <= 7099) return 'Articles of stone, plaster, cement';
    if (hsnNum >= 7100 && hsnNum <= 7199) return 'Natural or cultured pearls';
    if (hsnNum >= 7200 && hsnNum <= 8399) return 'Base metals and articles';
    if (hsnNum >= 8400 && hsnNum <= 8599) return 'Machinery and mechanical appliances';
    if (hsnNum >= 8600 && hsnNum <= 8999) return 'Transportation equipment';
    if (hsnNum >= 9000 && hsnNum <= 9199) return 'Optical, photographic instruments';
    if (hsnNum >= 9200 && hsnNum <= 9699) return 'Miscellaneous manufactured articles';
    if (hsnNum >= 9700 && hsnNum <= 9999) return 'Services';
    
    return 'Unknown category';
  }

  /**
   * Batch validate multiple GST numbers
   */
  async batchValidateGST(gstNumbers) {
    const results = [];
    
    for (const gstNumber of gstNumbers) {
      try {
        const result = await this.validateGSTNumber(gstNumber);
        results.push(result);
      } catch (error) {
        results.push({
          valid: false,
          error: error.message,
          gstNumber: gstNumber
        });
      }
    }
    
    return results;
  }
}

module.exports = new GSTValidationService();
