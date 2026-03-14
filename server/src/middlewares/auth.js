const jwt   = require('jsonwebtoken');
const User  = require('../models/User');
const Agent = require('../models/Agent');

/**
 * protect — works for BOTH business owners AND agents.
 *
 * Owner token payload:  { id, type: 'owner' }
 * Agent  token payload: { id, type: 'agent', ownerId }
 *
 * After this middleware req.scope is attached:
 *
 *   req.scope.businessId   — the owner's _id (for all DB queries)
 *   req.scope.leadFilter   — MongoDB filter to apply on EVERY lead query
 *                            Owner → { userId: businessId }
 *                            Agent → { userId: businessId, assignedTo: agentId }
 *   req.scope.isAgent      — boolean
 *   req.scope.agentId      — agent's own _id (undefined for owners)
 */
exports.protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type === 'agent') {
      const agent = await Agent.findById(decoded.id).select('-password');
      if (!agent) return res.status(401).json({ message: 'Agent not found' });

      const businessId = decoded.ownerId;

      req.user = {
        id:      agent._id.toString(),
        name:    agent.name,
        email:   agent.email,
        role:    agent.role,
        type:    'agent',
        ownerId: businessId,
      };
      req.isAgent = true;

      // ── Agent scope: only their assigned leads ──────────────
      req.scope = {
        businessId,
        isAgent:  true,
        agentId:  agent._id,
        // Every lead query MUST include this filter
        leadFilter: {
          userId:     businessId,
          assignedTo: agent._id,
        },
        // Message queries — leads assigned to this agent only
        msgFilter: {
          userId: businessId,
        },
      };

    } else {
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return res.status(401).json({ message: 'User not found' });

      req.user = {
        id:    user._id.toString(),
        name:  user.name,
        email: user.email,
        role:  'owner',
        type:  'owner',
      };
      req.isAgent = false;

      // ── Owner scope: all business leads ─────────────────────
      req.scope = {
        businessId: user._id.toString(),
        isAgent:    false,
        agentId:    null,
        leadFilter: { userId: user._id.toString() },
        msgFilter:  { userId: user._id.toString() },
      };
    }

    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/** Blocks agents from owner-only endpoints */
exports.ownerOnly = (req, res, next) => {
  if (req.isAgent) {
    return res.status(403).json({ message: 'Only the account owner can do this' });
  }
  next();
};

/** Allows owner + manager-role agents only */
exports.managerOrOwner = (req, res, next) => {
  if (req.isAgent && req.user.role === 'agent') {
    return res.status(403).json({ message: 'Manager or owner access required' });
  }
  next();
};