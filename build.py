#!/usr/bin/python3

import os, os.path, re, zipfile, json, shutil

def get_files_to_zip(browser):
	"""Get list of files to include in the build, excluding browser-specific files

	Extension packages SHOULD include:
	- manifest.json (or manifest-firefox.json for Firefox)
	- js/ folder (with browser-specific exclusions)
	- css/ folder
	- images/ folder
	- popup.html
	- redirector.html
	- help.html
	- privacy.md
	"""
	# Exclude development files, docs, and non-essential files
	exclude = [
		# Build scripts and tools
		r'\.(py|sh|pem|bak)$', #file endings
		r'build\.py$',
		r'nex-build\.sh$',

		# Hidden files and folders (git, claude, etc.)
		r'(\\|/)\.', #.git, .github, .claude, .gitignore, .specify, etc.

		# Development files
		r'package\.json$',
		r'package-lock\.json$',
		r'icon\.html$',

		# Documentation (not needed in extension packages)
		r'README\.md$',
		r'BUILD\.md$',
		r'DECISIONS\.md$',
		r'CHANGELOG\.md$',
		r'CLAUDE\.md$',
		r'CONTRIBUTING\.md$',
		r'LICENSE$',
		r'LICENSE\.md$',

		# Development directories
		r'(\\|/)(promo|unittest|build|specs|tests|node_modules)(\\|/)',

		# Alternate manifests (handled separately)
		r'manifest-firefox\.json$', # Will be included only for Firefox build
	]

	# MV3-specific exclusions for Firefox (which uses MV2)
	if browser == 'firefox':
		exclude.extend([
			r'migration\.js$', # MV3 migration utility
			r'declarative-rules\.js$', # MV3 declarativeNetRequest
		])

	zippable_files = []
	for root, folders, files in os.walk('.'):
		print(root)
		for f in files:
			file = os.path.join(root,f)
			if not any(re.search(p, file) for p in exclude):
				zippable_files.append(file)

	return zippable_files


def create_addon(files, browser):
	"""Create browser-specific addon package"""
	output_folder = 'build'
	if not os.path.isdir(output_folder):
		os.mkdir(output_folder)

	if browser == 'firefox':
		ext = 'xpi'
	else:
		ext = 'zip'

	output_file = os.path.join(output_folder, f'redirector-{browser}.{ext}')
	zf = zipfile.ZipFile(output_file, 'w', zipfile.ZIP_STORED)
	cert = 'extension-certificate.pem'

	print('')
	print(f'**** Creating addon for {browser} ****')

	if browser == 'opera' and not os.path.exists(cert):
		print('Extension certificate does not exist, cannot create .nex file for Opera')
		return

	for f in files:
		print('Adding', f)

		# Handle manifest selection: Firefox uses manifest-firefox.json, others use manifest.json
		if f.endswith('manifest.json'):
			# For Firefox, use manifest-firefox.json if it exists
			if browser == 'firefox' and os.path.exists('./manifest-firefox.json'):
				print('  Using manifest-firefox.json for Firefox (MV2)')
				manifest = json.load(open('./manifest-firefox.json'))
			else:
				manifest = json.load(open(f))

			# Browser-specific manifest modifications
			if browser == 'firefox':
				# Firefox MV2 manifest - keep all Firefox-specific keys
				pass
			else:
				# Chrome/Edge/Opera MV3 manifest - remove Firefox-specific keys
				if 'applications' in manifest:
					del manifest['applications']
				if 'browser_specific_settings' in manifest and browser == 'opera':
					# Only remove for Opera to avoid warnings
					del manifest['browser_specific_settings']

			if browser == 'opera':
				# Opera-specific: open options in new tab
				manifest['options_ui']['page'] = 'redirector.html'
				manifest['options_ui']['chrome_style'] = False

			zf.writestr(f[2:], json.dumps(manifest, indent=2))

		# Skip manifest-firefox.json in non-Firefox builds
		elif f.endswith('manifest-firefox.json'):
			if browser != 'firefox':
				print('  Skipping manifest-firefox.json (not Firefox build)')
				continue
			# For Firefox, this is already handled above
			continue
		else:
			zf.write(f[2:])

	zf.close()
	print(f'Created: {output_file}')

	if browser == 'opera':
		#Create .nex
		os.system('./nex-build.sh %s %s %s' % (output_file, output_file.replace('.zip', '.nex'), cert))



if __name__ == '__main__':
	#Make sure we can run this from anywhere
	folder = os.path.dirname(os.path.realpath(__file__))
	os.chdir(folder)

	print('******* REDIRECTOR BUILD SCRIPT *******')
	print('')
	print('Building MV3 (Chrome/Edge/Opera) and MV2 (Firefox) packages...')
	print('')

	# Build Chrome MV3
	files = get_files_to_zip('chrome')
	create_addon(files, 'chrome')

	# Build Edge MV3
	files = get_files_to_zip('edge')
	create_addon(files, 'edge')

	# Build Opera MV3
	files = get_files_to_zip('opera')
	create_addon(files, 'opera')

	# Build Firefox MV2
	files = get_files_to_zip('firefox')
	create_addon(files, 'firefox')

	print('')
	print('******* BUILD COMPLETE *******')
	print('Chrome/Edge/Opera: Manifest V3')
	print('Firefox: Manifest V2')
