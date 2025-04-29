const nextConfig = {
	serverActions: {
		// Increase request body limit for server actions (default 1MB)
		bodySizeLimit: 20 * 1024 * 1024, // 20MB
	},
};

export default nextConfig;
