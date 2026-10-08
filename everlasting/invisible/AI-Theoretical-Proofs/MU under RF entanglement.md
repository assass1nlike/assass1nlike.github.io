我们希望让模型忘掉一部分训练样本，同时保留与这些样本高度相关的能力。例如，模型学习的是“鱼”这个 superclass，而我们只想忘掉其中的“观赏鱼” subclass；如果直接降低模型对“鱼”的识别能力，其他鱼类也会受到影响。这就是 retain–forget entanglement：forget set 与一部分 retain set 共享语义或特征，优化两者时可能发生冲突。

设训练集为 $D=\{(x_i,y_i)\}_{i=1}^{N}$，这里 $N$ 是样本数，$\mathcal X$ 是输入空间，$x_i\in\mathcal X$ 是第 $i$ 个输入，$y_i\in\mathcal Y=\{1,\ldots,n\}$ 是其分类标签，$n$ 是模型预测的类别数。在 superclass 分类任务中，$n$ 指 superclass 的数量。模型参数为有限维实向量 $\theta$，原始模型参数为 $\theta_0$. 我们将模型输出 $f_\theta(x)$ 写成类别概率向量，第 $j$ 个分量 $[f_\theta(x)]_j$ 是模型赋给类别 $j$ 的概率，预测规则是选择概率最大的类别。

将待遗忘的样本记为 forget set $D_f\subset D$，其余样本构成 retain set $D_r=D\setminus D_f$. 根据它们与 $D_f$ 的关联程度，进一步划分为

$$
D_r=D_r^{\mathrm{adj}}\cup D_r^{\mathrm{rem}},
\qquad
D_r^{\mathrm{adj}}\cap D_r^{\mathrm{rem}}=\varnothing.
$$

这里 adjacent retain set $D_r^{\mathrm{adj}}$ 是与待遗忘样本高度相关、容易受到误伤的部分，remote retain set $D_r^{\mathrm{rem}}$ 是其余关联较弱的部分。以下各集合均非空，$|\cdot|$ 表示集合的样本数。

我们使用 cross-entropy loss

$$
\ell\left(f_\theta(x_i),y_i\right)
=-\log [f_\theta(x_i)]_{y_i},
$$

这里 $\log$ 是自然对数，所讨论的 loss 均为有限值。三个集合上的平均 loss 分别为

$$
\begin{aligned}
\mathcal L_f(\theta)
&=\frac{1}{|D_f|}\sum\limits_{(x_i,y_i)\in D_f}
\ell\left(f_\theta(x_i),y_i\right),\\
\mathcal L_r^{\mathrm{adj}}(\theta)
&=\frac{1}{|D_r^{\mathrm{adj}}|}\sum\limits_{(x_i,y_i)\in D_r^{\mathrm{adj}}}
\ell\left(f_\theta(x_i),y_i\right),\\
\mathcal L_r^{\mathrm{rem}}(\theta)
&=\frac{1}{|D_r^{\mathrm{rem}}|}\sum\limits_{(x_i,y_i)\in D_r^{\mathrm{rem}}}
\ell\left(f_\theta(x_i),y_i\right).
\end{aligned}
$$

这里的 forgetting 目标是降低模型对 $D_f$ 中给定标签的预测准确率。因此，我们希望提高 $\mathcal L_f$，同时维持 retain set 上的表现。注意，这个目标本身不等价于让模型与“删除 $D_f$ 后重新训练”的模型具有相同分布。

## 两阶段优化与 loss 分布

第一阶段先处理 forgetting 与 remote retain 的平衡：

$$
\min\limits_\theta-\mathcal L_f(\theta)
\quad\text{subject to}\quad
\mathcal L_r^{\mathrm{rem}}(\theta)
=\mathcal L_r^{\mathrm{rem}}(\theta_0).
$$

我们暂时不加入 adjacent retain 的优化目标，以免一开始就要求模型同时忘掉目标样本、恢复与它们高度相关的样本。为求解这个约束问题，一个直接的想法是把约束偏离的平方加入目标：

$$
-\mathcal L_f(\theta)
+\frac{\mu}{2}\left(\mathcal L_r^{\mathrm{rem}}(\theta)
-\mathcal L_r^{\mathrm{rem}}(\theta_0)\right)^2,
\qquad \mu>0.
$$

这里 $\mu$ 是惩罚系数。平方项在 remote retain loss 高于或低于原值时都为正，因此会推动它回到原值。但仅有这一项时，约束对参数梯度的贡献为

$$
\mu\left(\mathcal L_r^{\mathrm{rem}}(\theta)
-\mathcal L_r^{\mathrm{rem}}(\theta_0)\right)
\nabla_\theta\mathcal L_r^{\mathrm{rem}}(\theta).
$$

这里 $\nabla_\theta$ 表示对参数求梯度。一旦约束满足，这个梯度就变为零，而提高 forget loss 的梯度仍可能把参数推离约束。因此，有限的 $\mu$ 下，两者往往需要在约束尚有偏差的位置才能平衡。

例如，考虑标量变量 $x\in\mathbb R$ 的问题 $\min_x -x$，约束为 $x=0$. 唯一可行解是 $x=0$，但平方惩罚问题的解满足

$$
\frac{\mathrm d}{\mathrm dx}\left(-x+\frac\mu2x^2\right)
=-1+\mu x=0
\quad\Longrightarrow\quad x=\frac1\mu.
$$

这说明有限的惩罚系数未必能消除约束偏差。虽然增大 $\mu$ 可以缩小偏差，却也会增大惩罚项沿约束法向的曲率，使参数更新需要更小的步长。

我们希望更新最终停在这样的位置：remote retain loss 满足约束，而且在附近所有满足约束的参数中，已经无法进一步降低 $-\mathcal L_f$. 这就是约束内的局部最优点。为了设计能停在这种位置的更新规则，我们先看它需要怎样的梯度平衡，再据此构造目标函数。平方惩罚在约束满足时不再提供梯度，因此我们还需要一个即使此时也能抵消 forgetting 梯度的分量。

设 $\theta^\star$ 是这样的局部最优点。若两个 loss 在它附近连续可微，且 $\nabla_\theta\mathcal L_r^{\mathrm{rem}}(\theta^\star)\neq0$，那么必定存在一个系数 $\lambda^\star\in\mathbb R$，使

$$
\begin{aligned}
-\nabla_\theta\mathcal L_f(\theta^\star)
+\lambda^\star\nabla_\theta\mathcal L_r^{\mathrm{rem}}(\theta^\star)&=0,\\
\mathcal L_r^{\mathrm{rem}}(\theta^\star)
-\mathcal L_r^{\mathrm{rem}}(\theta_0)&=0.
\end{aligned}
$$

为什么最优点处的两个梯度必须满足第一行？我们先看哪些方向允许参数在保持约束的同时移动。设 $v$ 是参数移动的瞬时方向，remote retain loss 沿这个方向的变化率为

$$
\left\langle\nabla_\theta\mathcal L_r^{\mathrm{rem}}(\theta^\star),v\right\rangle.
$$

这里 $\langle\cdot,\cdot\rangle$ 是 Euclidean 内积。要保持这个 loss 不变，变化率就必须为零，所以允许的方向都垂直于 remote retain 梯度。在前面约束梯度非零的条件下，满足约束的参数在局部形成一个光滑曲面，每个这样的方向都可以作为曲面上一条路径的瞬时方向。我们沿路径移动即可保持约束，不必沿直线走。

如果 $\theta^\star$ 已经是约束内的局部最优点，那么沿任意这样的路径，目标 $-\mathcal L_f$ 的变化率也必须为零；否则选择路径的一个移动方向，就能在保持约束的同时降低目标，与局部最优矛盾。因此

$$
\left\langle\nabla_\theta\mathcal L_r^{\mathrm{rem}}(\theta^\star),v\right\rangle=0
\quad\Longrightarrow\quad
\left\langle-\nabla_\theta\mathcal L_f(\theta^\star),v\right\rangle=0.
$$

这意味着，目标梯度在所有垂直于 remote retain 梯度的方向上都没有分量，只能与它平行。因此，我们可以用某个倍数的 remote retain 梯度抵消目标梯度；把这个倍数记为 $\lambda^\star$，就得到第一行的等式。

这个梯度平衡关系给出了设计目标函数的依据：我们需要一个系数可调的 remote retain 梯度分量。为此，加入线性项 $\lambda\left(\mathcal L_r^{\mathrm{rem}}(\theta)-\mathcal L_r^{\mathrm{rem}}(\theta_0)\right)$. 在约束满足时，这一项的数值为零，但其参数梯度 $\lambda\nabla_\theta\mathcal L_r^{\mathrm{rem}}(\theta)$ 仍可以非零，因而能够提供平方惩罚此时缺少的平衡作用。它与平方项结合，便得到 augmented Lagrangian：

$$
\begin{aligned}
\mathcal L_{\mathrm{aug}}(\theta;\lambda,\mu)
={}&-\mathcal L_f(\theta)
+\lambda\left(\mathcal L_r^{\mathrm{rem}}(\theta)
-\mathcal L_r^{\mathrm{rem}}(\theta_0)\right)\\
&+\frac{\mu}{2}\left(\mathcal L_r^{\mathrm{rem}}(\theta)
-\mathcal L_r^{\mathrm{rem}}(\theta_0)\right)^2.
\end{aligned}
$$

这里 $\lambda\in\mathbb R$ 是需要通过迭代求得的 Lagrange multiplier. 对参数求梯度可得

$$
\begin{aligned}
\nabla_\theta\mathcal L_{\mathrm{aug}}(\theta;\lambda,\mu)
={}&-\nabla_\theta\mathcal L_f(\theta)\\
&+\left[\lambda+\mu\left(
\mathcal L_r^{\mathrm{rem}}(\theta)
-\mathcal L_r^{\mathrm{rem}}(\theta_0)\right)\right]
\nabla_\theta\mathcal L_r^{\mathrm{rem}}(\theta).
\end{aligned}
$$

因此，$\lambda$ 提供逐渐学到的平衡系数，平方项则根据当前约束偏离提供即时修正。在前面的标量例子中，目标变为 $-x+\lambda x+\mu x^2/2$；当 $\lambda=1$ 时，最优解恰好是 $x=0$，无需让 $\mu$ 无限增大。

我们事先不知道合适的乘子，因此从 $\lambda=0$ 开始，交替更新参数与乘子：

$$
\begin{aligned}
\theta&\leftarrow\theta-\eta_1\nabla_\theta
\mathcal L_{\mathrm{aug}}(\theta;\lambda,\mu),\\
\lambda&\leftarrow\lambda+\mu\left(
\mathcal L_r^{\mathrm{rem}}(\theta)
-\mathcal L_r^{\mathrm{rem}}(\theta_0)\right).
\end{aligned}
$$

这里 $\eta_1>0$ 是第一阶段的学习率，第二行使用第一行更新后的参数。如果 remote retain loss 高于原值，乘子就增大，使下一轮参数更新增加一个降低该 loss 的梯度分量；如果低于原值，乘子就减小，向相反方向纠正。这样，$\lambda$ 累积历次约束偏离，在约束满足时也不会被重置为零，而会保留学到的平衡作用。

从数学上看，乘子更新是梯度上升，因为

$$
\frac{\partial\mathcal L_{\mathrm{aug}}(\theta;\lambda,\mu)}
{\partial\lambda}
=\mathcal L_r^{\mathrm{rem}}(\theta)-\mathcal L_r^{\mathrm{rem}}(\theta_0).
$$

所以这两条规则对 $\theta$ 做下降、对 $\lambda$ 做上升。乘子的作用是强化尚未满足的约束，不能把它当成普通模型参数一起最小化。

将乘子步长取为 $\mu$ 还有一个直接的依据：前面参数梯度中方括号内的系数，恰好就是更新后的乘子。若固定旧乘子后，参数子问题已经优化到梯度为零的位置，那么更新后的乘子就使这一位置满足上面的一阶梯度平衡条件。我们随后继续调整参数与乘子，尝试同时消除约束偏离。注意，论文每轮只对参数做一步梯度下降，并未将子问题求解到驻点，因此这解释的是更新的设计原理，不代表每轮都已满足最优性条件，也不保证非凸训练无条件收敛。

记第一阶段结束时的参数为 $\bar\theta$，并在第二阶段固定它作为参照。

第二阶段希望减小 $\mathcal L_r^{\mathrm{adj}}$，同时避免破坏第一阶段的 forgetting 效果。一个自然的做法是把 adjacent retain 的梯度中会改变 $\mathcal L_f$ 和 $\mathcal L_r^{\mathrm{rem}}$ 的分量去掉，使后两者在一阶近似下不变。但保持平均 forget loss，并不能阻止一部分 forget 样本的 loss 下降：其他样本的 loss 可以上升，恰好抵消这部分下降。于是平均 loss 几乎不变，模型却重新预测对了一些本该忘掉的样本。

为控制这种变化，我们比较整个 forget loss 分布。参数为 $\theta$ 时，其 empirical distribution 为

$$
P_\theta^{\mathrm{forget}}
:=\frac{1}{|D_f|}\sum\limits_{(x_i,y_i)\in D_f}
\delta_{\ell\left(f_\theta(x_i),y_i\right)}.
$$

这里 $\delta_a$ 是一个取值恒为 $a$ 的概率分布，称为 Dirac measure. 对实数轴上的任意可测集合 $B$，它赋予的概率为

$$
\delta_a(B)=
\begin{cases}
1,&a\in B,\\
0,&a\notin B.
\end{cases}
$$

在上面的求和中，每个样本都贡献一个集中在自身 loss 处的分布，再以相同权重 $1/|D_f|$ 混合。因此，对任意 loss 取值范围 $B$，

$$
P_\theta^{\mathrm{forget}}(B)
=\frac{
\left|\left\{(x_i,y_i)\in D_f:
\ell\left(f_\theta(x_i),y_i\right)\in B
\right\}\right|
}{|D_f|}.
$$

也就是说，$P_\theta^{\mathrm{forget}}(B)$ 就是 loss 落在 $B$ 中的样本比例。我们从这个分布抽取一个 loss，等价于从 $D_f$ 均匀抽取一个样本，再返回它的 loss；若多个样本的 loss 相同，它们的概率会累加在同一个数值上。

我们用 Wasserstein-2 distance 衡量两个分布之间的距离。对于 $\mathbb R^d$ 上具有有限二阶矩的概率分布 $P,Q$，定义

$$
W_2(P,Q)
=\left(
\inf\limits_{\gamma\in\Gamma(P,Q)}
\int\limits_{\mathbb R^d\times\mathbb R^d}
\|u-v\|^2\,\mathrm d\gamma(u,v)
\right)^{1/2}.
$$

这里 $d$ 是分布所在空间的维数，$u,v\in\mathbb R^d$ 是配对的两个位置，$\|\cdot\|$ 是 Euclidean norm；$\Gamma(P,Q)$ 是第一边缘分布为 $P$、第二边缘分布为 $Q$ 的所有联合概率分布的集合。这样的联合分布 $\gamma$ 称为 coupling，它描述如何将 $P$ 中的概率质量与 $Q$ 中的概率质量配对。$W_2^2$ 是所有配对方案中最小的平均平方距离。在这里，配对的是标量 loss，所以 $d=1$.

比较 $P_{\bar\theta}^{\mathrm{forget}}$ 与 $P_\theta^{\mathrm{forget}}$ 时，两个分布只记录各个 loss 数值出现的比例，并不记录它们来自哪个样本。因此，计算 $W_2$ 时可以重新安排配对：一个样本在 $\bar\theta$ 下的 loss，可以与另一个样本在 $\theta$ 下的 loss 配对，只要两边各个数值参与配对的总概率符合各自的分布。按同一个样本配对只是其中一种方案；$W_2$ 会在所有允许的方案中寻找平均平方距离最小的那个。我们由此约束的是 loss 数值的整体分布。对于任意两组实数 $a_1,\ldots,a_N$ 和 $b_1,\ldots,b_N$，定义经验分布

$$
P=\frac1N\sum\limits_{i=1}^{N}\delta_{a_i},
\qquad
Q=\frac1N\sum\limits_{i=1}^{N}\delta_{b_i},
$$

这里 $N$ 表示每组数的数量；应用到 forget loss 分布时，取 $N=|D_f|$. 将这两组数分别排序为 $\bar a_1\leq\cdots\leq\bar a_N$ 和 $\bar b_1\leq\cdots\leq\bar b_N$，就有

$$
W_2(P,Q)
=\left(\frac1N\sum\limits_{i=1}^{N}
\left(\bar a_i-\bar b_i\right)^2\right)^{1/2}.
$$

这个排序公式的原因是：平方距离下，交叉配对不会更便宜。具体地，任一 coupling 都可以用非负质量 $\gamma_{ij}$ 表示，$\gamma_{ij}$ 是从 $\bar a_i$ 配到 $\bar b_j$ 的质量，且每行、每列的质量之和均为 $1/N$. 若 $\gamma_{11}<1/N$，则必有 $i,j>1$ 使 $\gamma_{1j}>0$、$\gamma_{i1}>0$. 令 $\delta=\min\{\gamma_{1j},\gamma_{i1}\}$，将这两项各减少 $\delta$，同时将 $\gamma_{11}$、$\gamma_{ij}$ 各增加 $\delta$. 这不改变边缘分布，而修改前后的成本差为

$$
\begin{aligned}
&\delta\left[
\left(\bar a_1-\bar b_j\right)^2
+\left(\bar a_i-\bar b_1\right)^2
-\left(\bar a_1-\bar b_1\right)^2
-\left(\bar a_i-\bar b_j\right)^2
\right]\\
&\qquad=2\delta\left(\bar a_i-\bar a_1\right)
\left(\bar b_j-\bar b_1\right)\geq0.
\end{aligned}
$$

每次操作至少消去第一行或第一列中的一个非对角正质量，而且不会在这些位置新增质量，因此有限次操作后就有 $\gamma_{11}=1/N$. 对剩余行列重复这一过程，我们便将任意 coupling 转换为逐项排序配对，且总成本不增加。这证明了排序公式。$\square$

有了这个可以直接计算的分布距离，我们定义修改后的 forget loss

$$
\widetilde{\mathcal L}_f(\theta)
:=(1-\alpha)\mathcal L_f(\theta)
+\alpha W_2^2\left(P_{\bar\theta}^{\mathrm{forget}},
P_\theta^{\mathrm{forget}}\right),
\qquad \alpha\in[0,1].
$$

这里 $\alpha$ 控制平均 loss 与分布距离的权重。第二阶段不直接最小化这个量，而是在降低 adjacent retain loss 时，尽量保持它不变。接下来的两个命题分别回答：投影更新能否做到这种局部保持，以及保持这个量为什么有助于限制 forget accuracy.

## Proposition 4.1

固定当前参数 $\theta$、第一阶段参数 $\bar\theta$ 和权重 $\alpha$. 假设 $\widetilde{\mathcal L}_f$、$\mathcal L_r^{\mathrm{adj}}$、$\mathcal L_r^{\mathrm{rem}}$ 在 $\theta$ 的一个邻域内关于参数二阶连续可微。令

$$
V=\operatorname{span}\left\{
\nabla_\theta\widetilde{\mathcal L}_f(\theta),
\nabla_\theta\mathcal L_r^{\mathrm{rem}}(\theta)
\right\},
$$

这里 $V$ 是两个约束梯度的线性张成空间，$\operatorname{Proj}_V$ 表示 Euclidean 内积下到 $V$ 的正交投影。使用学习率 $\eta>0$，进行更新

$$
\Delta\theta
=-\eta\left(
\nabla_\theta\mathcal L_r^{\mathrm{adj}}(\theta)
-\operatorname{Proj}_V\nabla_\theta\mathcal L_r^{\mathrm{adj}}(\theta)
\right).
$$

那么，当 $\eta\to0$ 时，两个约束量的变化满足

$$
\begin{aligned}
\widetilde{\mathcal L}_f(\theta+\Delta\theta)
-\widetilde{\mathcal L}_f(\theta)&=O(\eta^2),\\
\mathcal L_r^{\mathrm{rem}}(\theta+\Delta\theta)
-\mathcal L_r^{\mathrm{rem}}(\theta)&=O(\eta^2).
\end{aligned}
$$

这里 $O(\eta^2)$ 表示：存在不依赖于 $\eta$ 的常数，使变化量的绝对值在充分小的 $\eta$ 下不超过该常数乘以 $\eta^2$. 如果进一步有 $\nabla_\theta\mathcal L_r^{\mathrm{adj}}(\theta)\notin V$，则存在只依赖当前参数及固定设置的常数 $c>0$，满足

$$
\mathcal L_r^{\mathrm{adj}}(\theta+\Delta\theta)
-\mathcal L_r^{\mathrm{adj}}(\theta)
=-c\eta+O(\eta^2).
$$

因此，充分小的正学习率会严格降低 adjacent retain loss.

我们可以从方向导数理解这个构造。一个可微 loss 沿更新方向的瞬时变化，是它的梯度与更新方向的内积。如果要求两个约束量的一阶变化都为零，更新方向就必须同时垂直于它们的梯度，也就是属于 $V^\perp$. 正交投影去掉了 adjacent retain 梯度中属于 $V$ 的分量，留下的正是满足这一要求的分量；沿其反方向走，仍能降低 adjacent retain loss，前提是这个分量不为零。

**证明。** 正交投影的基本性质是：对任意参数空间向量 $z$，$\operatorname{Proj}_V z\in V$，而 $z-\operatorname{Proj}_V z\in V^\perp$. 因此 $\Delta\theta\in V^\perp$，从而

$$
\left\langle\nabla_\theta\widetilde{\mathcal L}_f(\theta),
\Delta\theta\right\rangle=0,
\qquad
\left\langle\nabla_\theta\mathcal L_r^{\mathrm{rem}}(\theta),
\Delta\theta\right\rangle=0.
$$

这里 $\langle\cdot,\cdot\rangle$ 表示 Euclidean 内积。由于本次更新中 $\theta$ 和梯度固定，$\|\Delta\theta\|$ 不超过某个固定常数乘以 $\eta$. 对修改后的 forget loss 作 Taylor 展开，得到

$$
\begin{aligned}
&\widetilde{\mathcal L}_f(\theta+\Delta\theta)
-\widetilde{\mathcal L}_f(\theta)\\
&\quad=\left\langle\nabla_\theta\widetilde{\mathcal L}_f(\theta),
\Delta\theta\right\rangle
+\frac12\Delta\theta^\top
\nabla_\theta^2\widetilde{\mathcal L}_f(\theta)\Delta\theta
+o\left(\|\Delta\theta\|^2\right)\\
&\quad=\frac12\Delta\theta^\top
\nabla_\theta^2\widetilde{\mathcal L}_f(\theta)\Delta\theta
+o\left(\|\Delta\theta\|^2\right)
=O(\eta^2).
\end{aligned}
$$

这里 $\nabla_\theta^2$ 是 Hessian，$\top$ 表示转置，$o\left(\|\Delta\theta\|^2\right)$ 是相对于 $\|\Delta\theta\|^2$ 可忽略的余项。最后一步使用了固定 Hessian 的二次型绝对值不超过某个固定常数乘以 $\|\Delta\theta\|^2$. 对 remote retain loss 作同样展开，利用其一阶项也为零，就得到

$$
\mathcal L_r^{\mathrm{rem}}(\theta+\Delta\theta)
-\mathcal L_r^{\mathrm{rem}}(\theta)
=\frac12\Delta\theta^\top
\nabla_\theta^2\mathcal L_r^{\mathrm{rem}}(\theta)\Delta\theta
+o\left(\|\Delta\theta\|^2\right)
=O(\eta^2).
$$

接着看 adjacent retain loss. 由于投影分量与剩余分量正交，

$$
\begin{aligned}
&\left\langle\nabla_\theta\mathcal L_r^{\mathrm{adj}}(\theta),
\Delta\theta\right\rangle\\
&\quad=-\eta\left\langle
\nabla_\theta\mathcal L_r^{\mathrm{adj}}(\theta),
\nabla_\theta\mathcal L_r^{\mathrm{adj}}(\theta)
-\operatorname{Proj}_V\nabla_\theta\mathcal L_r^{\mathrm{adj}}(\theta)
\right\rangle\\
&\quad=-\eta\left\|
\nabla_\theta\mathcal L_r^{\mathrm{adj}}(\theta)
-\operatorname{Proj}_V\nabla_\theta\mathcal L_r^{\mathrm{adj}}(\theta)
\right\|^2\\
&\quad=-\eta\left(
\left\|\nabla_\theta\mathcal L_r^{\mathrm{adj}}(\theta)\right\|^2
-\left\|\operatorname{Proj}_V\nabla_\theta\mathcal L_r^{\mathrm{adj}}(\theta)\right\|^2
\right).
\end{aligned}
$$

定义

$$
c:=\left\|
\nabla_\theta\mathcal L_r^{\mathrm{adj}}(\theta)
-\operatorname{Proj}_V\nabla_\theta\mathcal L_r^{\mathrm{adj}}(\theta)
\right\|^2.
$$

若 $\nabla_\theta\mathcal L_r^{\mathrm{adj}}(\theta)\notin V$，投影后的剩余分量非零，因此 $c>0$. 再次使用 Taylor 展开，得到

$$
\begin{aligned}
&\mathcal L_r^{\mathrm{adj}}(\theta+\Delta\theta)
-\mathcal L_r^{\mathrm{adj}}(\theta)\\
&\quad=\left\langle\nabla_\theta\mathcal L_r^{\mathrm{adj}}(\theta),
\Delta\theta\right\rangle
+\frac12\Delta\theta^\top
\nabla_\theta^2\mathcal L_r^{\mathrm{adj}}(\theta)\Delta\theta
+o\left(\|\Delta\theta\|^2\right)\\
&\quad=-c\eta+O(\eta^2).
\end{aligned}
$$

取常数 $C>0$，使最后的余项绝对值在充分小的 $\eta$ 下不超过 $C\eta^2$. 再令 $\eta<c/(2C)$，总变化量便不超过 $-c\eta/2<0$，这就证明了严格下降。$\square$

这个命题说明，在有可用下降方向时，adjacent retain loss 获得一阶改善，而两个约束量只产生二阶变化。注意，直接受到保护的是 $\widetilde{\mathcal L}_f$，其平均 loss 项与 Wasserstein 项仍可能相互抵消；我们还需要说明这种抵消最多允许 forget accuracy 恢复到什么程度。

## Proposition 4.2

设 $n\geq2$ 是模型预测的类别数，$\alpha\in(0,1]$，$m>\log n$，$\varepsilon>0$. 假设第一阶段结束后，所有 forget 样本都满足

$$
\ell\left(f_{\bar\theta}(x_i),y_i\right)\geq m,
\qquad \forall(x_i,y_i)\in D_f,
$$

并且第二阶段得到的参数 $\theta$ 满足

$$
\left|\widetilde{\mathcal L}_f(\theta)
-\widetilde{\mathcal L}_f(\bar\theta)\right|<\varepsilon.
$$

令 $\operatorname{Acc}_f(\theta)$ 表示模型按最大类别概率预测时，在 $D_f$ 上预测正确的样本比例，取值范围为 $[0,1]$. 那么

$$
\operatorname{Acc}_f(\theta)
\leq\frac{1}{(m-\log n)^2}
\left(\frac{1-\alpha}{\alpha}
+\sqrt{\frac{\varepsilon}{\alpha}}\right)^2.
$$

这里 $m$ 是每个 forget 样本的初始 loss 下界，$\varepsilon$ 是相对于第一阶段终点的允许偏离量。条件 $m>\log n$ 要求每个 forget 样本的给定标签概率都低于 $1/n$，即低于均匀预测时的概率。它比“平均 forget loss 很大”更强。

证明的思路是把准确率变化转化为概率质量的移动。一个样本若被预测正确，它的 cross-entropy 不可能大于 $\log n$. 但参照分布中的所有 loss 都至少为 $m$，因此当前分布中每一份落到 $\log n$ 以下的质量，都必须与距离至少为 $m-\log n$ 的参照 loss 配对。这会消耗 Wasserstein 平方距离；只要我们能控制这个距离，就能控制预测正确的比例。

**证明。** 我们先证明，两个 loss 分布的均值差不超过它们的 $W_2$ 距离。取具有联合分布
$\gamma\in\Gamma\left(P_\theta^{\mathrm{forget}},P_{\bar\theta}^{\mathrm{forget}}\right)$ 的随机变量 $X,Y$，分别表示当前 loss 和参照 loss. 根据边缘分布，它们的期望分别为 $\mathcal L_f(\theta)$ 和 $\mathcal L_f(\bar\theta)$. 利用三角不等式和 Cauchy–Schwarz 不等式，得到

$$
\begin{aligned}
\left|\mathcal L_f(\theta)-\mathcal L_f(\bar\theta)\right|
&=\left|\mathbb E_\gamma[X-Y]\right|\\
&\leq\mathbb E_\gamma\left[|X-Y|\right]\\
&\leq\left(\mathbb E_\gamma\left[|X-Y|^2\right]\right)^{1/2}.
\end{aligned}
$$

这里 $\mathbb E_\gamma$ 表示按 coupling $\gamma$ 取期望。左边只依赖边缘分布，与如何配对无关。因此，对右边的所有 coupling 取下确界，就有

$$
\left|\mathcal L_f(\theta)-\mathcal L_f(\bar\theta)\right|
\leq W_2\left(P_\theta^{\mathrm{forget}},
P_{\bar\theta}^{\mathrm{forget}}\right).
$$

这一步说明：即使平均 forget loss 可以下降，它的下降幅度也受到 loss 分布移动距离的限制。

由于参照分布到自身的 Wasserstein 距离为零，
$\widetilde{\mathcal L}_f(\bar\theta)=(1-\alpha)\mathcal L_f(\bar\theta)$. 展开命题中的偏离条件，并使用刚刚得到的均值界，便有

$$
\begin{aligned}
&\alpha W_2^2\left(P_\theta^{\mathrm{forget}},
P_{\bar\theta}^{\mathrm{forget}}\right)\\
&\quad<\varepsilon+(1-\alpha)
\left(\mathcal L_f(\bar\theta)-\mathcal L_f(\theta)\right)\\
&\quad\leq\varepsilon+(1-\alpha)
W_2\left(P_\theta^{\mathrm{forget}},
P_{\bar\theta}^{\mathrm{forget}}\right).
\end{aligned}
$$

我们得到一个关于非负距离的二次不等式。因为 $\alpha>0$，该距离不能超过对应二次方程的正根，从而

$$
\begin{aligned}
W_2\left(P_\theta^{\mathrm{forget}},
P_{\bar\theta}^{\mathrm{forget}}\right)
&\leq\frac{(1-\alpha)+\sqrt{(1-\alpha)^2+4\alpha\varepsilon}}
{2\alpha}\\
&\leq\frac{(1-\alpha)+(1-\alpha)+2\sqrt{\alpha\varepsilon}}
{2\alpha}\\
&=\frac{1-\alpha}{\alpha}
+\sqrt{\frac{\varepsilon}{\alpha}}.
\end{aligned}
$$

第二步使用了
$\sqrt{(1-\alpha)^2+4\alpha\varepsilon}\leq(1-\alpha)+2\sqrt{\alpha\varepsilon}$：两边非负，右边的平方比左边的平方多出非负交叉项 $4(1-\alpha)\sqrt{\alpha\varepsilon}$.

下面把这个距离上界转化为准确率上界。如果样本 $(x_i,y_i)$ 被模型预测正确，则其给定标签的概率是所有类别概率的最大值。于是

$$
\begin{aligned}
1
&=\sum\limits_{j=1}^{n}[f_\theta(x_i)]_j
\leq n[f_\theta(x_i)]_{y_i},\\
[f_\theta(x_i)]_{y_i}&\geq\frac1n,\\
\ell\left(f_\theta(x_i),y_i\right)
&=-\log[f_\theta(x_i)]_{y_i}\leq\log n.
\end{aligned}
$$

因此，所有预测正确的样本都属于 loss 不超过 $\log n$ 的样本，得到

$$
\operatorname{Acc}_f(\theta)
\leq P_\theta^{\mathrm{forget}}\left((-\infty,\log n]\right).
$$

注意，这里只需要“预测正确蕴含 loss 不超过 $\log n$”，不需要反向推论。

参照分布 $P_{\bar\theta}^{\mathrm{forget}}$ 的全部质量都位于 $[m,\infty)$. 因而，对于任意 coupling
$\gamma\in\Gamma\left(P_\theta^{\mathrm{forget}},P_{\bar\theta}^{\mathrm{forget}}\right)$，只要当前 loss $u\leq\log n$，与它配对的参照 loss $v$ 就满足 $v\geq m$，从而 $|u-v|\geq m-\log n$. 我们据此估计成本：

$$
\begin{aligned}
\int\limits_{\mathbb R\times\mathbb R}
|u-v|^2\,\mathrm d\gamma(u,v)
&\geq\int\limits_{(-\infty,\log n]\times[m,\infty)}
|u-v|^2\,\mathrm d\gamma(u,v)\\
&\geq(m-\log n)^2
\gamma\left((-\infty,\log n]\times[m,\infty)\right)\\
&=(m-\log n)^2
P_\theta^{\mathrm{forget}}\left((-\infty,\log n]\right)\\
&\geq(m-\log n)^2\operatorname{Acc}_f(\theta).
\end{aligned}
$$

第三行成立，是因为 coupling 的第二个分量以概率 $1$ 落在 $[m,\infty)$，而第一个分量的边缘分布恰好是 $P_\theta^{\mathrm{forget}}$. 对所有 coupling 取下确界，便得到

$$
(m-\log n)^2\operatorname{Acc}_f(\theta)
\leq W_2^2\left(P_\theta^{\mathrm{forget}},
P_{\bar\theta}^{\mathrm{forget}}\right).
$$

最后代入前面的距离上界，并除以正数 $(m-\log n)^2$，得到

$$
\operatorname{Acc}_f(\theta)
\leq\frac{1}{(m-\log n)^2}
\left(\frac{1-\alpha}{\alpha}
+\sqrt{\frac{\varepsilon}{\alpha}}\right)^2.
\qquad\square
$$

这个结果把 forgetting 的保持分成了两个条件：第一阶段让每个 forget 样本都具有足够大的 loss，第二阶段限制 $\widetilde{\mathcal L}_f$ 相对于第一阶段终点的变化。两者共同限制了能重新进入低 loss 区域的样本比例。固定 $m,n,\varepsilon$ 时，增大 $\alpha$ 会减小这个上界；在 $\alpha=1$ 时，它变为 $\varepsilon/(m-\log n)^2$.

注意，Proposition 4.1 给出的是单步的局部保证，不能直接推出整个第二阶段都满足 Proposition 4.2 的偏离条件，多步产生的二阶误差仍可能累积。第一阶段的优化目标也不自动保证所有样本都满足 loss 下界。因此，准确率上界是在这些条件成立时的保证，而不是对整个训练过程无条件成立的结论。
