/**
 * Declarative Net Request Conversion Module
 *
 * Purpose: Convert Redirector redirect rules to chrome.declarativeNetRequest format
 * MV3 Migration: Replacement for blocking webRequest API
 *
 * Created: 2025-12-23
 * MV3 Migration: Redirector v4.0.0
 */

// CODE ARCHAEOLOGY: MV3 Migration - New file
// Reason: MV3 requires declarativeNetRequest for request interception
// Original (MV2): webRequest with blocking returned {redirectUrl: ...}
// New (MV3): declarativeNetRequest with dynamic rules

/**
 * Convert Redirector rule to declarativeNetRequest rule format
 * @param {Object} redirectorRule - Redirector rule object
 * @param {number} ruleId - Unique rule ID (must be > 0)
 * @returns {Object|null} declarativeNetRequest rule or null if can't convert
 */
function convertToDeclarativeRule(redirectorRule, ruleId) {
	if (!redirectorRule || !redirectorRule.includePattern || !redirectorRule.redirectUrl) {
		return null;
	}

	// Skip disabled rules
	if (redirectorRule.disabled) {
		return null;
	}

	try {
		const rule = {
			id: ruleId,
			priority: 1,
			action: {
				type: 'redirect'
			},
			condition: {
				resourceTypes: convertResourceTypes(redirectorRule.appliesTo)
			}
		};

		// Convert pattern based on type
		if (redirectorRule.patternType === 'W' || redirectorRule.patternType === 'wildcard') {
			// Wildcard pattern - convert to regex
			const regexPattern = wildcardToRegex(redirectorRule.includePattern);
			rule.condition.regexFilter = regexPattern;
		} else {
			// Regex pattern
			rule.condition.regexFilter = redirectorRule.includePattern;
		}

		// Add exclude pattern if present
		if (redirectorRule.excludePattern && redirectorRule.excludePattern.trim() !== '') {
			rule.condition.excludedInitiatorDomains = [];
			rule.condition.excludedRequestDomains = [];
			// Note: excludePattern regex can't be directly converted to domain filters
			// This is a limitation - complex exclude patterns won't work
		}

		// Convert redirect URL
		// declarativeNetRequest supports regex substitution with \1, \2 instead of $1, $2
		const redirectUrl = redirectorRule.redirectUrl.replace(/\$(\d+)/g, '\\$1');

		// Check if redirect is a transform (uses capture groups) or static URL
		if (redirectUrl.includes('\\')) {
			// Regex substitution redirect
			rule.action.redirect = {
				regexSubstitution: redirectUrl
			};
		} else {
			// Static URL redirect
			rule.action.redirect = {
				url: redirectorRule.redirectUrl
			};
		}

		return rule;

	} catch (error) {
		console.error('Failed to convert rule:', redirectorRule, error);
		return null;
	}
}

/**
 * Convert wildcard pattern to regex
 * @param {string} wildcardPattern - Wildcard pattern with * and ?
 * @returns {string} Regex pattern
 */
function wildcardToRegex(wildcardPattern) {
	// Escape special regex characters except * and ?
	let regex = wildcardPattern
		.replace(/[.+^${}()|[\]\\]/g, '\\$&')
		.replace(/\*/g, '.*')
		.replace(/\?/g, '.');

	return '^' + regex + '$';
}

/**
 * Convert Redirector resource types to declarativeNetRequest resource types
 * @param {Array<string>} appliesTo - Redirector resource types
 * @returns {Array<string>} declarativeNetRequest resource types
 */
function convertResourceTypes(appliesTo) {
	if (!appliesTo || appliesTo.length === 0) {
		// Default to main_frame if not specified
		return ['main_frame'];
	}

	const typeMap = {
		'main_frame': 'main_frame',
		'sub_frame': 'sub_frame',
		'stylesheet': 'stylesheet',
		'script': 'script',
		'image': 'image',
		'font': 'font',
		'object': 'object',
		'xmlhttprequest': 'xmlhttprequest',
		'ping': 'ping',
		'csp_report': 'csp_report',
		'media': 'media',
		'websocket': 'websocket',
		'webtransport': 'webtransport',
		'webbundle': 'webbundle',
		'other': 'other'
	};

	return appliesTo
		.map(type => typeMap[type.toLowerCase()] || type)
		.filter(type => type !== 'history'); // 'history' is handled separately with webNavigation
}

/**
 * Convert all Redirector rules to declarativeNetRequest rules
 * @param {Array<Object>} redirectorRules - Array of Redirector rule objects
 * @returns {Array<Object>} Array of declarativeNetRequest rules
 */
function convertAllRules(redirectorRules) {
	if (!Array.isArray(redirectorRules)) {
		return [];
	}

	const declarativeRules = [];
	let ruleId = 1;

	for (const redirectorRule of redirectorRules) {
		// Skip disabled rules
		if (redirectorRule.disabled) {
			continue;
		}

		// Skip history type rules (handled by webNavigation)
		if (redirectorRule.appliesTo &&
		    redirectorRule.appliesTo.length === 1 &&
		    redirectorRule.appliesTo[0] === 'history') {
			continue;
		}

		const declarativeRule = convertToDeclarativeRule(redirectorRule, ruleId);
		if (declarativeRule) {
			declarativeRules.push(declarativeRule);
			ruleId++;
		}
	}

	return declarativeRules;
}

/**
 * Update declarativeNetRequest dynamic rules
 * @param {Array<Object>} redirectorRules - Array of Redirector rule objects
 * @returns {Promise<void>}
 */
async function updateDeclarativeRules(redirectorRules) {
	const declarativeRules = convertAllRules(redirectorRules);

	console.log('Updating declarativeNetRequest rules:', declarativeRules.length, 'rules');

	// Get current dynamic rules
	const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
	const currentRuleIds = currentRules.map(rule => rule.id);

	// Update rules: remove all old rules, add new ones
	await chrome.declarativeNetRequest.updateDynamicRules({
		removeRuleIds: currentRuleIds,
		addRules: declarativeRules
	});

	console.log('declarativeNetRequest rules updated successfully');
}

// Export functions (if using modules)
if (typeof module !== 'undefined' && module.exports) {
	module.exports = {
		convertToDeclarativeRule,
		convertAllRules,
		updateDeclarativeRules,
		wildcardToRegex,
		convertResourceTypes
	};
}
